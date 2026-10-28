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

`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `ALLOWED_GITHUB_LOGIN` (the allowed GitHub **email**), `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`

The GitHub OAuth app's callback URL is `https://<deployment>.convex.site/api/auth/callback/github`.

## Testing the MCP server locally

1. `npm run dev`, sign in, and create a key in the dashboard's **AI access** dialog.
2. Add it to Claude Code (new sessions pick it up; check with `/mcp`):

   ```bash
   claude mcp add --transport http cspx-tracker-local http://localhost:3000/api/mcp \
     --header "Authorization: Bearer yaft_…"
   ```

   Or explore the tools interactively with `npx @modelcontextprotocol/inspector` (Streamable HTTP, same URL and header).

## Deploying

1. `npm run deploy:convex` — pushes functions and schema to production Convex.
2. Redeploy the Next.js app — the MCP tools in `lib/mcp/` run there, not on Convex.

Deploy Convex first, so new queries exist before the new frontend calls them.
