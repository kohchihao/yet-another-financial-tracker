/**
 * Functions backing the MCP endpoint (app/api/mcp/route.ts).
 *
 * MCP clients have no Convex Auth session, so these functions authenticate
 * with a personal API key instead (see convex/apiKeys.ts). The key is passed
 * as an argument by the Next.js route and resolved to a user server-side —
 * no user identifier is ever accepted from the caller.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireApiKeyUser } from "./lib/apiKeys";
import {
  assertValidTradeInput,
  deriveTradeFields,
  insertTrade,
  listUserTransactions,
  summarisePortfolio,
} from "./lib/transactions";
import type { Doc } from "./_generated/dataModel";

/** Window in which an identical purchase is treated as an accidental retry. */
const DUPLICATE_WINDOW_MS = 60_000;

/** The app's reference time zone (UTC+8, no DST) for "today" checks. */
const APP_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

function todayInAppTimeZone(now: number): string {
  return new Date(now + APP_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/** Shape returned to MCP clients — drops internal fields like userId. */
function toPublicTransaction(t: Doc<"transactions">) {
  return {
    id: t._id,
    type: t.type,
    date: t.date,
    priceUSD: t.priceUSD,
    units: t.units,
    transactionCostUSD: t.transactionCostUSD,
    investedCapitalUSD: t.investedCapitalUSD,
    totalCapitalOutputUSD: t.totalCapitalOutputUSD,
    createdAt: t.createdAt,
  };
}

/**
 * Records a BUY on behalf of the key's owner.
 *
 * Rejects future dates and, unless `allowDuplicate` is set, an identical BUY
 * (same date, price, units and fee) recorded in the last minute — agents
 * sometimes retry a tool call after a timeout.
 */
export const addPurchase = mutation({
  args: {
    apiKey: v.string(),
    date: v.string(),
    priceUSD: v.number(),
    units: v.number(),
    transactionCostUSD: v.number(),
    allowDuplicate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireApiKeyUser(ctx, args.apiKey);
    const trade = {
      date: args.date,
      priceUSD: args.priceUSD,
      units: args.units,
      transactionCostUSD: args.transactionCostUSD,
    };
    assertValidTradeInput(trade);

    const now = Date.now();
    if (trade.date > todayInAppTimeZone(now)) {
      throw new ConvexError(`Date ${trade.date} is in the future.`);
    }

    if (!args.allowDuplicate) {
      const { units } = deriveTradeFields(trade);
      const sameDay = await ctx.db
        .query("transactions")
        .withIndex("by_userId_date", (q) =>
          q.eq("userId", userId).eq("date", trade.date)
        )
        .take(100);
      const duplicate = sameDay.find(
        (t) =>
          t.type === "BUY" &&
          t.priceUSD === trade.priceUSD &&
          t.units === units &&
          t.transactionCostUSD === trade.transactionCostUSD &&
          now - t.createdAt < DUPLICATE_WINDOW_MS
      );
      if (duplicate) {
        throw new ConvexError(
          "An identical purchase was recorded less than a minute ago. " +
            "Pass allowDuplicate: true if this really is a second purchase."
        );
      }
    }

    const id = await insertTrade(ctx, userId, "BUY", trade);
    const created = await ctx.db.get(id);
    if (!created) throw new ConvexError("Failed to read back the new purchase");
    return toPublicTransaction(created);
  },
});

/**
 * Lists the key owner's transactions (BUYs and SELLs), latest first.
 * `sinceDate` (YYYY-MM-DD, inclusive) limits the range.
 */
export const listTransactions = query({
  args: {
    apiKey: v.string(),
    sinceDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireApiKeyUser(ctx, args.apiKey);
    if (
      args.sinceDate !== undefined &&
      !/^\d{4}-\d{2}-\d{2}$/.test(args.sinceDate)
    ) {
      throw new ConvexError(`Invalid sinceDate "${args.sinceDate}". Expected YYYY-MM-DD.`);
    }
    const rows = await listUserTransactions(ctx, userId, args.sinceDate);
    return rows.map(toPublicTransaction);
  },
});

/**
 * Net position totals for the key owner — the same figures the dashboard
 * summary uses (see `summarisePortfolio`).
 */
export const getPortfolioSummary = query({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireApiKeyUser(ctx, args.apiKey);
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return summarisePortfolio(rows);
  },
});
