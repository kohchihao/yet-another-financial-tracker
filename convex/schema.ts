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

  // Personal API keys used by MCP clients (Authorization: Bearer <key>).
  // Only the SHA-256 hash of the key is stored; the raw key is shown once.
  apiKeys: defineTable({
    userId: v.id("users"),
    name: v.string(),
    hashedKey: v.string(), // hex SHA-256 of the raw key
    prefix: v.string(), // first characters of the raw key, for display
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_hashedKey", ["hashedKey"])
    .index("by_userId", ["userId"]),
});
