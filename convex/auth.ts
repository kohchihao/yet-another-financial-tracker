import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const login = (args.profile as { login?: string }).login;
      if (login !== process.env.ALLOWED_GITHUB_LOGIN) {
        throw new Error("Unauthorized: this application is private.");
      }
      if (args.existingUserId) return args.existingUserId;
      return ctx.db.insert("users", {});
    },
  },
});
