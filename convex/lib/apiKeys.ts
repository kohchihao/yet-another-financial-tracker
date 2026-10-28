import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Prefix on every raw key, so keys are recognisable in configs and secret scanners. */
export const API_KEY_PREFIX = "yaft_";

/** Number of leading characters stored and shown in the UI to identify a key. */
export const API_KEY_DISPLAY_LENGTH = API_KEY_PREFIX.length + 6;

/** Hex-encoded SHA-256 of the raw key. Only this hash is persisted. */
export async function hashApiKey(rawKey: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawKey)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Resolves a raw API key to the owning user's ID.
 * Throws a generic error for unknown, malformed or revoked keys so callers
 * can't distinguish between those cases.
 */
export async function requireApiKeyUser(
  ctx: QueryCtx | MutationCtx,
  rawKey: string
): Promise<{ userId: Id<"users">; keyId: Id<"apiKeys"> }> {
  if (!rawKey.startsWith(API_KEY_PREFIX)) throw new ConvexError("Invalid API key");
  const hashedKey = await hashApiKey(rawKey);
  const key = await ctx.db
    .query("apiKeys")
    .withIndex("by_hashedKey", (q) => q.eq("hashedKey", hashedKey))
    .unique();
  if (!key || key.revokedAt !== undefined) throw new ConvexError("Invalid API key");
  return { userId: key.userId, keyId: key._id };
}
