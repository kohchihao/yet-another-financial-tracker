import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { monthsAgo, todayInAppTimeZone } from "./dates";

type Transaction = FunctionReturnType<typeof api.mcp.listTransactions>[number];

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

function getConvex(): ConvexHttpClient {
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(convexUrl);
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

function summarise(transactions: Transaction[]) {
  const buys = transactions.filter((t) => t.type === "BUY");
  const sells = transactions.filter((t) => t.type === "SELL");
  const sum = (rows: Transaction[], pick: (t: Transaction) => number) =>
    rows.reduce((acc, t) => acc + pick(t), 0);
  return {
    count: transactions.length,
    buyCount: buys.length,
    sellCount: sells.length,
    unitsBought: round(sum(buys, (t) => t.units), 4),
    unitsSold: round(sum(sells, (t) => t.units), 4),
    netUnits: round(sum(buys, (t) => t.units) - sum(sells, (t) => t.units), 4),
    totalBuyCapitalOutputUSD: round(sum(buys, (t) => t.totalCapitalOutputUSD), 2),
    totalSellProceedsUSD: round(sum(sells, (t) => t.investedCapitalUSD), 2),
    totalFeesUSD: round(sum(transactions, (t) => t.transactionCostUSD), 2),
  };
}

function jsonResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

/** Converts Convex errors into an MCP tool error the model can read and act on. */
function errorResult(error: unknown) {
  const message =
    error instanceof ConvexError
      ? String(error.data)
      : "Something went wrong talking to the tracker backend.";
  if (!(error instanceof ConvexError)) console.error("[mcp] tool error", error);
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

function requireApiKey(token: string | undefined): string {
  // withMcpAuth({ required: true }) guarantees this, but keep tools safe on their own.
  if (!token) throw new ConvexError("Missing API key");
  return token;
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .describe("Trade date in YYYY-MM-DD (Singapore time).");

export function registerTrackerTools(server: McpServer): void {
  server.registerTool(
    "add_purchase",
    {
      title: "Add CSPX purchase",
      description:
        "Record a BUY of CSPX (iShares Core S&P 500 UCITS ETF, USD) in the tracker. " +
        "All amounts are in USD. Invested capital and total outlay are derived " +
        "server-side. Returns the stored transaction.",
      inputSchema: z.object({
        date: isoDate,
        priceUSD: z.number().positive().describe("Price per unit in USD."),
        units: z
          .number()
          .positive()
          .describe("Units bought. Fractional units allowed (rounded to 4dp)."),
        transactionCostUSD: z
          .number()
          .min(0)
          .describe("Broker fee for this trade in USD (0 if none)."),
        allowDuplicate: z
          .boolean()
          .optional()
          .describe(
            "Set true only to intentionally record a second identical purchase " +
              "within a minute of the first."
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args, ctx) => {
      try {
        const transaction = await getConvex().mutation(api.mcp.addPurchase, {
          apiKey: requireApiKey(ctx.http?.authInfo?.token),
          ...args,
        });
        return jsonResult({ transaction });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "list_transactions",
    {
      title: "List all transactions",
      description:
        "Load every recorded CSPX transaction — BUYs and SELLs — latest first, " +
        "with a summary of totals.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (ctx) => {
      try {
        const transactions = await getConvex().query(api.mcp.listTransactions, {
          apiKey: requireApiKey(ctx.http?.authInfo?.token),
        });
        return jsonResult({ summary: summarise(transactions), transactions });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "list_recent_transactions",
    {
      title: "List recent transactions",
      description:
        "Load CSPX transactions — BUYs and SELLs — from the last N months " +
        "(default 6, counted back from today in Singapore time), latest first, " +
        "with a summary of totals for that window.",
      inputSchema: z.object({
        months: z
          .number()
          .int()
          .min(1)
          .max(120)
          .optional()
          .describe("How many months back to include. Defaults to 6."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ months = 6 }, ctx) => {
      try {
        const today = todayInAppTimeZone();
        const since = monthsAgo(today, months);
        const transactions = await getConvex().query(api.mcp.listTransactions, {
          apiKey: requireApiKey(ctx.http?.authInfo?.token),
          sinceDate: since,
        });
        return jsonResult({
          range: { from: since, to: today, months },
          summary: summarise(transactions),
          transactions,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
