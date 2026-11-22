# CSPX Tracker

Personal portfolio tracker for IBKR CSPX investments. Next.js 16 (App Router) + [Convex](https://convex.dev) backend, gated by GitHub OAuth.

## Daily development

```bash
npm run dev
```

Starts both processes side by side (output is prefixed with `[dev:backend]` / `[dev:frontend]`):

- **Convex** (`convex dev`) — pushes `convex/` to your dev deployment on every save and regenerates `convex/_generated/`
- **Next.js** (`next dev`) — the app at [http://localhost:3000](http://localhost:3000)

Run either one alone with `npm run dev:backend` or `npm run dev:frontend`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Convex + Next.js dev servers together |
| `npm run dev:backend` | Convex dev only (watch + push to dev deployment) |
| `npm run dev:frontend` | Next.js dev only |
| `npm run build` | Production build of the Next.js app |
| `npm run lint` | ESLint |
| `npm run deploy:convex` | Push `convex/` to the **production** deployment |

## First-time setup (new machine)

```bash
npm install
npx convex dev   # log in, pick the existing project; writes .env.local
```

Convex env vars live on the deployment, not in `.env.local`. Check them with `npx convex env list` (add `--prod` for production). Required:

`AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`, `ALLOWED_GITHUB_LOGIN` (the allowed GitHub **email**)

A local `npx convex dev` push fails until those three exist on the local deployment. Placeholders are enough:

```bash
npx convex env set AUTH_GITHUB_CLIENT_ID dummy
npx convex env set AUTH_GITHUB_CLIENT_SECRET dummy
npx convex env set ALLOWED_GITHUB_LOGIN you@example.com
```

The GitHub OAuth app's callback URL is `https://<deployment>.convex.site/oauth/github/callback`. Sign-in sessions last 5 days. A user row stores optional `name`, `email`, and `image`.

## Testing the MCP server locally

1. `npm run dev`, sign in, and create a key in the dashboard's **AI access** dialog.
2. Add it to Claude Code (new sessions pick it up; check with `/mcp`):

   ```bash
   claude mcp add --transport http cspx-tracker-local http://localhost:3000/api/mcp \
     --header "Authorization: Bearer yaft_…"
   ```

   Or explore the tools interactively with `npx @modelcontextprotocol/inspector` (Streamable HTTP, same URL and header).

## Deploying

The Vercel build command is `npx convex deploy --cmd 'npm run build'`. A merge to `main` deploys Convex production and the Next.js app together. `npm run deploy:convex` is the same Convex push, for a manual production deploy.

Preview builds need a separate Convex preview deploy key. On Vercel, keep the production `CONVEX_DEPLOY_KEY` on Production only, and set a preview deploy key as `CONVEX_DEPLOY_KEY` for Preview only. Preview deployments also need `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`, and `ALLOWED_GITHUB_LOGIN` (from a test GitHub OAuth app).
