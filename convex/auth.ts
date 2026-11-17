import { components, internal } from "./_generated/api";
import { setupConvexAuth } from "@convex-dev/auth/server";
import { setupGithub } from "@convex-dev/auth/methods/github/server";

const auth = setupConvexAuth({
  component: components.auth,
  sessionMaxLifetimeSeconds: 3 * 24 * 60 * 60,
});
export const { signOut, refreshSession, isAuthenticated } = auth;

export const { startSignInWithGithub, completeSignInWithGithub } = setupGithub(
  auth,
  {
    component: components.authGithub,
    allowedRedirectOrigins: [
      "http://localhost:3000",
      "https://fin-koh.vercel.app",
      "https://stonks.kohchihao.com",
    ],
  },
).attachUserCallbacks({
  createUser: internal.users.createUser,
  onSignIn: internal.users.onSignIn,
});
