import GitHub from '@auth/core/providers/github';
import { convexAuth } from '@convex-dev/auth/server';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const email = args.profile.email;
      if (email !== process.env.ALLOWED_GITHUB_LOGIN) {
        throw new Error('Unauthorized: this application is private.');
      }
      if (args.existingUserId) return args.existingUserId;

      return ctx.db.insert('users', {
        email: email,
        image: args.profile?.image,
        name: args.profile?.name,
      });
    },
  },
});
