import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type TradeType = "BUY" | "SELL";

export interface TradeInput {
  date: string;
  priceUSD: number;
  units: number;
  transactionCostUSD: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalises a trade and computes the derived capital fields.
 *
 *   - units                 — rounded to 4dp (IBKR supports fractional shares)
 *   - investedCapitalUSD    — priceUSD × units, rounded to cents
 *   - totalCapitalOutputUSD — investedCapitalUSD + transactionCostUSD, rounded to cents
 *
 * Shared by the UI mutations, CSV import and the MCP endpoint so all write
 * paths produce identical rows.
 */
export function deriveTradeFields(input: TradeInput) {
  const units = Math.round(input.units * 10000) / 10000;
  const investedCapitalUSD = Math.round(input.priceUSD * units * 100) / 100;
  const totalCapitalOutputUSD =
    Math.round((investedCapitalUSD + input.transactionCostUSD) * 100) / 100;
  return { units, investedCapitalUSD, totalCapitalOutputUSD };
}

/**
 * Validates trade input that arrives from an untrusted caller (e.g. an AI agent
 * over MCP). The UI path already constrains these through its form.
 */
export function assertValidTradeInput(input: TradeInput): void {
  if (!DATE_RE.test(input.date) || Number.isNaN(Date.parse(input.date))) {
    throw new ConvexError(`Invalid date "${input.date}". Expected YYYY-MM-DD.`);
  }
  if (!Number.isFinite(input.priceUSD) || input.priceUSD <= 0) {
    throw new ConvexError("priceUSD must be a positive number.");
  }
  if (!Number.isFinite(input.units) || input.units <= 0) {
    throw new ConvexError("units must be a positive number.");
  }
  if (
    !Number.isFinite(input.transactionCostUSD) ||
    input.transactionCostUSD < 0
  ) {
    throw new ConvexError("transactionCostUSD must be zero or a positive number.");
  }
}

/** Inserts a normalised trade row for the given user. */
export async function insertTrade(
  ctx: MutationCtx,
  userId: string,
  type: TradeType,
  input: TradeInput
): Promise<Id<"transactions">> {
  const { units, investedCapitalUSD, totalCapitalOutputUSD } =
    deriveTradeFields(input);
  return ctx.db.insert("transactions", {
    userId,
    type,
    date: input.date,
    priceUSD: input.priceUSD,
    units,
    transactionCostUSD: input.transactionCostUSD,
    investedCapitalUSD,
    totalCapitalOutputUSD,
    createdAt: Date.now(),
  });
}

/**
 * Lists a user's transactions latest-first (date desc, then createdAt desc).
 * When `sinceDate` (YYYY-MM-DD, inclusive) is given, the `by_userId_date`
 * index bounds the scan to that range.
 */
export async function listUserTransactions(
  ctx: QueryCtx,
  userId: string,
  sinceDate?: string
) {
  const rows =
    sinceDate === undefined
      ? await ctx.db
          .query("transactions")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect()
      : await ctx.db
          .query("transactions")
          .withIndex("by_userId_date", (q) =>
            q.eq("userId", userId).gte("date", sinceDate)
          )
          .collect();
  return rows.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });
}
