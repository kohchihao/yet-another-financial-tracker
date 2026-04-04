import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Auth guard used at the top of every query and mutation.
 * Resolves the current user's Convex ID from the session.
 * Throws "Unauthenticated" if there is no active session, short-circuiting the handler.
 */
async function requireUser(ctx: QueryCtx | MutationCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthenticated");
  return userId;
}

/**
 * Returns all transactions belonging to the current user, sorted latest-first.
 *
 * Uses the `by_userId` index to efficiently scope the DB scan to only this user's rows.
 * Sorting is done in-memory after the fetch because Convex indexes don't support
 * multi-field ordering on different columns simultaneously:
 *   1. Primary sort: `date` descending (ISO string comparison works correctly here)
 *   2. Tiebreaker: `createdAt` descending — for multiple trades on the same calendar day,
 *      the most recently recorded entry appears first.
 */
export const listTransactions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    // Sort latest-first by date, then by createdAt desc as tiebreaker
    return transactions.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.createdAt - a.createdAt;
    });
  },
});

/**
 * Computes aggregate portfolio totals across all of the user's transactions.
 *
 * Uses `reduce` to accumulate four running sums. BUYs contribute positively (+1)
 * and SELLs contribute negatively (-1) via the `sign` variable, so the final
 * `totalUnits` and capital figures reflect the net position after all trades.
 *
 * Transaction cost is always added (never subtracted) regardless of trade direction
 * because fees are a real cash outflow on both buys and sells.
 *
 * Returned fields:
 *   - totalUnits            — net shares currently held
 *   - totalInvestedCapital  — net USD deployed into the position (price × units, net of sells)
 *   - totalCapitalOutput    — net total cash spent including fees
 *   - totalTransactionCost  — cumulative fees paid across all trades
 */
export const getPortfolioSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return transactions.reduce(
      (acc, t) => {
        const sign = t.type === "BUY" ? 1 : -1;
        return {
          totalUnits: acc.totalUnits + sign * t.units,
          totalInvestedCapital:
            acc.totalInvestedCapital + sign * t.investedCapitalUSD,
          totalCapitalOutput:
            acc.totalCapitalOutput + sign * t.totalCapitalOutputUSD,
          totalTransactionCost: acc.totalTransactionCost + t.transactionCostUSD,
        };
      },
      {
        totalUnits: 0,
        totalInvestedCapital: 0,
        totalCapitalOutput: 0,
        totalTransactionCost: 0,
      }
    );
  },
});

/**
 * Records a BUY trade and persists the derived capital fields.
 *
 * Input: date, price per unit (USD), number of units, and the broker fee.
 *
 * Derived fields calculated before insert:
 *   - units                — rounded to 4 decimal places (IBKR supports fractional shares)
 *   - investedCapitalUSD   — gross cost of the shares: priceUSD × units, rounded to cents
 *   - totalCapitalOutputUSD — total cash out of pocket: investedCapital + transaction fee
 */
export const addBuyTransaction = mutation({
  args: {
    date: v.string(),
    priceUSD: v.number(),
    units: v.number(),
    transactionCostUSD: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Normalise units to 4dp to avoid floating-point drift accumulating over many trades
    const units = Math.round(args.units * 10000) / 10000;
    // Gross share cost (price × units), stored to the nearest cent
    const investedCapitalUSD = Math.round(args.priceUSD * units * 100) / 100;
    // Total cash out of pocket = share cost + broker fee
    const totalCapitalOutputUSD =
      Math.round((investedCapitalUSD + args.transactionCostUSD) * 100) / 100;

    return ctx.db.insert("transactions", {
      userId,
      type: "BUY",
      date: args.date,
      priceUSD: args.priceUSD,
      units,
      transactionCostUSD: args.transactionCostUSD,
      investedCapitalUSD,
      totalCapitalOutputUSD,
      createdAt: Date.now(),
    });
  },
});

/**
 * Records a SELL trade after validating the user holds enough units.
 *
 * Validation:
 *   Fetches all existing transactions, computes the net unit balance (BUYs minus SELLs),
 *   and rejects the sell if it would exceed that balance. A small epsilon (0.00001) is
 *   added to the held total before comparison to absorb cumulative floating-point rounding
 *   errors that might otherwise incorrectly block a valid full-liquidation sell.
 *
 * Derived fields (same logic as addBuyTransaction):
 *   - investedCapitalUSD    — gross proceeds of the sale: priceUSD × units
 *   - totalCapitalOutputUSD — net cash received after deducting the broker fee
 *
 * Note: on a SELL, `totalCapitalOutputUSD` represents proceeds minus fee (money in minus cost),
 * which is why the `getPortfolioSummary` query subtracts SELL capital from the running totals.
 */
export const addSellTransaction = mutation({
  args: {
    date: v.string(),
    priceUSD: v.number(),
    units: v.number(),
    transactionCostUSD: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Validate units available
    const allTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Net unit balance: sum BUYs, subtract SELLs
    const totalUnits = allTransactions.reduce((sum, t) => {
      return sum + (t.type === "BUY" ? t.units : -t.units);
    }, 0);

    const units = Math.round(args.units * 10000) / 10000;
    // Allow a tiny epsilon over the held amount to handle floating-point rounding
    if (units > totalUnits + 0.00001) {
      throw new Error(
        `Insufficient units. You hold ${totalUnits.toFixed(4)} but tried to sell ${units.toFixed(4)}.`
      );
    }

    const investedCapitalUSD = Math.round(args.priceUSD * units * 100) / 100;
    const totalCapitalOutputUSD =
      Math.round((investedCapitalUSD + args.transactionCostUSD) * 100) / 100;

    return ctx.db.insert("transactions", {
      userId,
      type: "SELL",
      date: args.date,
      priceUSD: args.priceUSD,
      units,
      transactionCostUSD: args.transactionCostUSD,
      investedCapitalUSD,
      totalCapitalOutputUSD,
      createdAt: Date.now(),
    });
  },
});

/**
 * Hard-deletes a single transaction by its Convex document ID.
 *
 * Ownership is verified before deletion: the transaction must belong to the
 * currently authenticated user, preventing one user from deleting another's records.
 */
export const deleteTransaction = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const transaction = await ctx.db.get(args.id);
    if (!transaction) throw new Error("Transaction not found");
    // Ownership check — reject if this record belongs to a different user
    if (transaction.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
});

/**
 * Batch-inserts an array of transactions, typically sourced from a CSV import.
 *
 * Each row must be pre-validated (type, date, priceUSD, units, transactionCostUSD)
 * before being passed in — this mutation applies the same rounding and derived-field
 * logic as `addBuyTransaction` / `addSellTransaction` but does not enforce the
 * unit-balance check on SELLs (CSV imports are assumed to be historically correct).
 *
 * Returns `{ inserted: N }` so the caller can confirm how many rows were written.
 */
export const importTransactions = mutation({
  args: {
    rows: v.array(
      v.object({
        type: v.union(v.literal("BUY"), v.literal("SELL")),
        date: v.string(),
        priceUSD: v.number(),
        units: v.number(),
        transactionCostUSD: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    let inserted = 0;

    for (const row of args.rows) {
      // Apply the same normalisation as individual add mutations
      const units = Math.round(row.units * 10000) / 10000;
      const investedCapitalUSD = Math.round(row.priceUSD * units * 100) / 100;
      const totalCapitalOutputUSD =
        Math.round((investedCapitalUSD + row.transactionCostUSD) * 100) / 100;

      await ctx.db.insert("transactions", {
        userId,
        type: row.type,
        date: row.date,
        priceUSD: row.priceUSD,
        units,
        transactionCostUSD: row.transactionCostUSD,
        investedCapitalUSD,
        totalCapitalOutputUSD,
        createdAt: Date.now(),
      });
      inserted++;
    }

    return { inserted };
  },
});
