# Sign in with GitHub reaches GitHub's OAuth page

## Sub-features

- On `/sign-in`, clicking **Sign in with GitHub** starts the Convex Auth v1 GitHub provider.
- The browser is sent to `https://github.com/login/oauth/authorize` (scope `read:user user:email`, PKCE S256, `redirect_uri` `http://127.0.0.1:3211/api/auth/callback/github`).
- With no GitHub session, GitHub responds by navigating to `https://github.com/login` with `return_to` set to `/login/oauth/authorize?...`. Either URL is a pass.
- The check stops there. It does not type a username, password, or 2FA code, and it does not click GitHub's own Sign in button.

The button is `components/auth/SignInButton.tsx`. Its click handler is `signIn("github", { redirectTo: "/dashboard" })` from `@convex-dev/auth/react`. The provider is `GitHub({ issuer: "https://github.com/login/oauth" })` in `convex/auth.ts`, whose authorize URL is `https://github.com/login/oauth/authorize`.

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
- `#login_field`, if GitHub rendered it, is empty. The script never fills it.

`{ exact: true }` matters. GitHub's own submit button is named `Sign in`, and a substring match would be the wrong control. This check never clicks that button.

The screenshot is `$VERIFY_CSPX_EVIDENCE/github-authorize.png`. The final URL and the authorize request URLs are in `github-oauth.json`.

### When the GitHub OAuth client id is not set

`npx convex env list` on a fresh local deployment prints `No environment variables set.` `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are unset. Do not set them for this check, and do not read the secret.

The provider still builds an authorize URL. With no client id configured, the query parameter is the literal string `client_id=undefined`. GitHub accepts the navigation and redirects to:

```text
https://github.com/login?client_id=undefined&return_to=%2Flogin%2Foauth%2Fauthorize%3F...
```

That is a pass. The assertion is the URL shape above, plus the fact that the login form was not submitted. It does not require a real client id, a real secret, or a GitHub account. `github-oauth.json` records `clientIdLiteralUndefined: true` in this case.

If `AUTH_GITHUB_ID` is already present on the local deployment, the authorize URL carries that id instead of `undefined`. The same URL assertion still applies, and the script still does not submit the form or touch `AUTH_GITHUB_SECRET`.

## Gotchas

- The button has no error handler. A thrown `signIn` would leave the browser on `/sign-in`. On the current v1 code, a missing client id does not throw; it is stringified into the authorize URL. A run that stays on `/sign-in` is a failure, not a skipped check.
- Do not follow a successful GitHub login. The app's `createOrUpdateUser` in `convex/auth.ts` also rejects any email other than `ALLOWED_GITHUB_LOGIN`, which is not set locally.
- The OAuth `redirect_uri` host is `127.0.0.1:3211` (the Convex site URL), not `localhost:3000`. Next proxies `POST /api/auth` to Convex, and the action returns the GitHub URL.
