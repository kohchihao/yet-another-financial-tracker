import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  API_KEY_DISPLAY_LENGTH,
  API_KEY_PREFIX,
  hashApiKey,
  requireApiKeyUser,
} from "./lib/apiKeys";

/** Only refresh `lastUsedAt` once per minute to avoid a write on every MCP request. */
const LAST_USED_WRITE_INTERVAL_MS = 60_000;

/**
 * Creates a new API key for the signed-in user and returns the raw key.
 *
 * Runs as an action because randomness inside queries/mutations is
 * deterministic in Convex; `crypto.getRandomValues` in an action is not.
 * The raw key is returned exactly once — only its hash is stored.
 */
export const createApiKey = action({
  args: { name: v.string() },
  handler: async (ctx, args): Promise<{ key: string; prefix: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const name = args.name.trim();
    if (name.length === 0 || name.length > 64) {
      throw new Error("Key name must be 1–64 characters.");
    }

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const body = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const key = `${API_KEY_PREFIX}${body}`;
    const prefix = key.slice(0, API_KEY_DISPLAY_LENGTH);

    await ctx.runMutation(internal.apiKeys.storeApiKey, {
      name,
      prefix,
      hashedKey: await hashApiKey(key),
    });
    return { key, prefix };
  },
});

/** Persists a hashed key for the calling user. Called only from `createApiKey`. */
export const storeApiKey = internalMutation({
  args: { name: v.string(), prefix: v.string(), hashedKey: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    await ctx.db.insert("apiKeys", {
      userId,
      name: args.name,
      prefix: args.prefix,
      hashedKey: args.hashedKey,
      createdAt: Date.now(),
    });
    return null;
  },
});

/** Lists the signed-in user's keys (never including the hash). */
export const listApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    return keys.map((k) => ({
      _id: k._id,
      name: k.name,
      prefix: k.prefix,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt ?? null,
      revokedAt: k.revokedAt ?? null,
    }));
  },
});

/** Revokes one of the signed-in user's keys. Revoked keys stop working immediately. */
export const revokeApiKey = mutation({
  args: { id: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const key = await ctx.db.get(args.id);
    if (!key || key.userId !== userId) throw new Error("API key not found");
    if (key.revokedAt === undefined) {
      await ctx.db.patch(args.id, { revokedAt: Date.now() });
    }
    return null;
  },
});

/**
 * Checks a raw key presented by an MCP client and records its use.
 * Returns `null` instead of throwing so the MCP route can answer with a 401.
 */
export const verifyApiKey = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    try {
      const { keyId } = await requireApiKeyUser(ctx, args.apiKey);
      const key = await ctx.db.get(keyId);
      const now = Date.now();
      if (
        key &&
        (key.lastUsedAt === undefined ||
          now - key.lastUsedAt > LAST_USED_WRITE_INTERVAL_MS)
      ) {
        await ctx.db.patch(keyId, { lastUsedAt: now });
      }
      return { keyId };
    } catch {
      return null;
    }
  },
});
