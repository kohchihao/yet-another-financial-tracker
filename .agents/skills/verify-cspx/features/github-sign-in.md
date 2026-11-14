# Sign in with GitHub reaches GitHub's OAuth page

## Sub-features

- On `/sign-in`, clicking **Sign in with GitHub** calls `useSignInWithGithub(api.auth)` with no `redirectTo`, so GitHub returns to this page.
- The browser requests `https://github.com/login/oauth/authorize`. That request's `redirect_uri` ends in `/oauth/github/callback` (on the local backend, `http://127.0.0.1:3211/oauth/github/callback`).
- With no GitHub session, GitHub responds by navigating to `https://github.com/login` with `return_to` set to `/login/oauth/authorize?...`. Either URL is a pass, and the authorize request still has to carry the callback above.
- The check stops there. It does not type a username, password, or 2FA code, and it does not click GitHub's own Sign in button.

The button is `components/auth/SignInButton.tsx`. It uses `useSignInWithGithub` and `useOauth` from `@convex-dev/auth/methods/github/react`. The backend mounts the GitHub component at `httpPrefix: "/oauth/github"`, and that prefix is the callback path.

## How to get to it (user POV)

From the sign-in card, click **Sign in with GitHub**. The browser leaves `localhost` and shows GitHub's sign-in page, because GitHub asks you to log in before it will show the authorize consent screen. Stop. Do not sign in.

## Driving it with Playwright

After the signed-out check, the same page clicks the button and waits:

```js
await page.getByRole("button", { name: "Sign in with GitHub", exact: true }).click();
await page.waitForURL((url) => {
  // hostname github.com, and either
  // pathname /login/oauth/authorize, or
  // pathname /login AND return_to contains /login/oauth/authorize
});
```

Pass requires:

- The final URL matches that predicate.
- At least one request URL contained `https://github.com/login/oauth/authorize`.
- That authorize request's `redirect_uri` query parameter ends with `/oauth/github/callback`.
- `#login_field`, if GitHub rendered it, is empty. The script never fills it.

`{ exact: true }` matters. GitHub's own submit button is named `Sign in`, and a substring match would be the wrong control. This check never clicks that button.

The screenshot is `$VERIFY_CSPX_EVIDENCE/github-authorize.png`. The final URL and the authorize request URLs are in `github-oauth.json`.

### Client id

v2 will not push functions until `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`, and `ALLOWED_GITHUB_LOGIN` are set. `launch.sh` fills those with non-secret placeholders on the local anonymous deployment when they are missing. Do not replace them with a real GitHub client secret, and do not read the values back. The authorize URL then carries `client_id=verify-cspx-local`.

The check still passes when the query parameter is the literal `client_id=undefined` (GitHub then redirects to `/login` with that authorize URL in `return_to`). Either way the login form must stay empty, and the authorize request's `redirect_uri` must end in `/oauth/github/callback`. `github-oauth.json` records `clientIdLiteralUndefined`.

## Gotchas

- A failure to start the flow shows an error on `/sign-in` and does not navigate. A run that stays on `/sign-in` is a failure, not a skipped check.
- Do not follow a successful GitHub login. `onSignIn` in `convex/users.ts` rejects any email other than `ALLOWED_GITHUB_LOGIN`. This check never gets that far.
- The OAuth `redirect_uri` host is `127.0.0.1:3211` (the Convex site URL), not `localhost:3000`. The path ends in `/oauth/github/callback`. Starting the flow calls `startSignInWithGithub` on the Convex client; completing it later posts to `/auth/signin`.
