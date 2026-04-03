import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

async function requireUser(ctx: QueryCtx | MutationCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthenticated");
  return userId;
}

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

export const addBuyTransaction = mutation({
  args: {
    date: v.string(),
    priceUSD: v.number(),
    units: v.number(),
    transactionCostUSD: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const units = Math.round(args.units * 10000) / 10000;
    const investedCapitalUSD = Math.round(args.priceUSD * units * 100) / 100;
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

    const totalUnits = allTransactions.reduce((sum, t) => {
      return sum + (t.type === "BUY" ? t.units : -t.units);
    }, 0);

    const units = Math.round(args.units * 10000) / 10000;
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

export const deleteTransaction = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const transaction = await ctx.db.get(args.id);
    if (!transaction) throw new Error("Transaction not found");
    if (transaction.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
});

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
