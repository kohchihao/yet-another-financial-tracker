import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  transactions: defineTable({
    userId: v.string(),
    type: v.union(v.literal("BUY"), v.literal("SELL")),
    date: v.string(), // YYYY-MM-DD
    priceUSD: v.number(),
    units: v.number(),
    transactionCostUSD: v.number(),
    investedCapitalUSD: v.number(), // derived: priceUSD × units
    totalCapitalOutputUSD: v.number(), // derived: investedCapitalUSD + transactionCostUSD
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"]),
});
