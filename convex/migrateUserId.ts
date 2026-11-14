import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const BATCH = 200;
const ids = { oldId: v.id("users"), newId: v.id("users") };

const vCounts = v.object({
  oldUserExists: v.boolean(),
  newUserExists: v.boolean(),
  transactions: v.object({ old: v.number(), new: v.number() }),
  apiKeys: v.object({ old: v.number(), new: v.number() }),
});

async function counts(ctx: QueryCtx, oldId: Id<"users">, newId: Id<"users">) {
  const tx = (userId: string) =>
    ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  const keys = (userId: Id<"users">) =>
    ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  return {
    oldUserExists: (await ctx.db.get(oldId)) !== null,
    newUserExists: (await ctx.db.get(newId)) !== null,
    transactions: {
      old: (await tx(oldId)).length,
      new: (await tx(newId)).length,
    },
    apiKeys: {
      old: (await keys(oldId)).length,
      new: (await keys(newId)).length,
    },
  };
}

export const report = internalQuery({
  args: ids,
  returns: vCounts,
  handler: (ctx, { oldId, newId }) => counts(ctx, oldId, newId),
});

export const migrate = internalMutation({
  args: { ...ids, dryRun: v.optional(v.boolean()) },
  returns: v.union(
    v.object({ dryRun: v.literal(true), before: vCounts }),
    v.object({
      dryRun: v.literal(false),
      moved: v.object({ transactions: v.number(), apiKeys: v.number() }),
      after: vCounts,
      done: v.boolean(),
    }),
  ),
  handler: async (ctx, { oldId, newId, dryRun = true }) => {
    if (oldId === newId) throw new Error("oldId and newId are the same");
    const before = await counts(ctx, oldId, newId);
    if (!before.newUserExists) throw new Error("newId has no users row");
    if (dryRun) return { dryRun: true as const, before };

    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", oldId))
      .take(BATCH);
    for (const row of tx) await ctx.db.patch(row._id, { userId: newId });

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", oldId))
      .take(BATCH);
    for (const row of keys) await ctx.db.patch(row._id, { userId: newId });

    const after = await counts(ctx, oldId, newId);
    return {
      dryRun: false as const,
      moved: { transactions: tx.length, apiKeys: keys.length },
      after,
      done: after.transactions.old === 0 && after.apiKeys.old === 0,
    };
  },
});

export const deleteOldUser = internalMutation({
  args: ids,
  returns: v.null(),
  handler: async (ctx, { oldId, newId }) => {
    const c = await counts(ctx, oldId, newId);
    if (!c.newUserExists) throw new Error("newId has no users row");
    if (c.transactions.old !== 0 || c.apiKeys.old !== 0) {
      throw new Error("rows still reference oldId");
    }
    if (c.oldUserExists) await ctx.db.delete(oldId);
    return null;
  },
});
