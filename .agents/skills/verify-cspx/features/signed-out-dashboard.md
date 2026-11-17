# Signed-out /dashboard redirects to /sign-in

## Sub-features

- A browser with no Convex Auth cookies that opens `http://localhost:3000/dashboard` receives HTTP 307 with `location: /sign-in`, then HTTP 200 on `/sign-in`.
- The sign-in page shows the text `Qian Inc.`, `Welcome back`, and `Sign in to start planning`, and a button whose accessible name is `Sign in with GitHub`.

`proxy.ts` is the Next.js 16 proxy (there is no `middleware.ts`). `convexAuthNextjsProxy` sends an unauthenticated `/dashboard` or `/dashboard/*` request to `/sign-in` with `nextjsProxyRedirect`. The matcher keeps `/auth/*` out of the proxy.

## How to get to it (user POV)

Open `http://localhost:3000/dashboard` while signed out. The address bar ends on `http://localhost:3000/sign-in`. The card says "Welcome back" and the only action is "Sign in with GitHub".

## Driving it with Playwright

`scripts/drive-ui.cjs` (invoked by `scripts/drive.sh`) launches headless Google Chrome with a fresh context and runs:

```js
await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Sign in with GitHub", exact: true }).waitFor();
```

Pass requires every one of these:

- The redirect chain is `http://localhost:3000/dashboard` status 307, then `http://localhost:3000/sign-in` status 200. Playwright reads this from `response.request()` walking `redirectedFrom()`.
- `page.url()` is `http://localhost:3000/sign-in`.
- `getByText("Qian Inc.", { exact: true })`, `getByText("Welcome back", { exact: true })`, and `getByText("Sign in to start planning", { exact: true })` each match once.

`Welcome back` is a `CardTitle` div (`data-slot="card-title"`), not a heading, so the check uses text rather than `getByRole("heading")`.

The screenshot is `$VERIFY_CSPX_EVIDENCE/dashboard-redirect-sign-in.png`. The hops are in `signed-out.json`.

## Gotchas

- Next.js has to be up. With no auth cookies, v2 treats the request as signed out without calling Convex, and still redirects.
- A signed-in session is sent the other way: `/sign-in` redirects to `/dashboard`. This check uses a new browser context so there is no `__convexAuthJWT` or `__convexAuthRefreshToken` cookie.
- The 307 is on the document request. `curl -D - --max-redirs 0 http://localhost:3000/dashboard` shows the same `HTTP/1.1 307` and `location: /sign-in`. The harness asserts it through Playwright because that is the path a browser takes.
