import { getAuthUserId } from "@convex-dev/auth/server";
import { vGithubProfile } from "@convex-dev/auth/methods/github/server";
import { ConvexError, v } from "convex/values";
import { PRIVATE_APP_MESSAGE } from "./authErrors";
import { env, internalMutation, query } from "./_generated/server";

const vMethod = v.object({ name: v.literal("github"), profile: vGithubProfile });

export const createUser = internalMutation({
  args: { method: vMethod },
  returns: v.id("users"),
  handler: async (ctx) => {
    return await ctx.db.insert("users", {});
  },
});

export const onSignIn = internalMutation({
  args: { method: vMethod, userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { method, userId }) => {
    const { profile } = method;
    if (!profile.emailVerified || profile.email !== env.ALLOWED_GITHUB_LOGIN) {
      throw new ConvexError(PRIVATE_APP_MESSAGE);
    }
    await ctx.db.patch(userId, {
      name: profile.name,
      email: profile.email,
      image: profile.avatarUrl,
    });
    return null;
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db.get(userId);
  },
});
