# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Commands

```bash
npm run dev            # Start Convex (watch mode) and Next.js dev servers together
npm run dev:backend    # Convex dev only
npm run dev:frontend   # Next.js dev only
npm run build          # Production build
npm run lint           # Run ESLint
npm run deploy:convex  # Push convex/ to production
```

## Architecture

**CSPX Tracker** is a personal portfolio tracker for IBKR CSPX investments. Single-user app gated by GitHub OAuth with an email allowlist.

**Stack:** Next.js 16 (App Router) + Convex backend + shadcn/ui + Tailwind CSS 4

### Data Flow

1. All backend logic lives in `convex/` — queries, mutations, and actions run serverless on Convex
2. `convex/transactions.ts` contains all CRUD for transactions; `convex/prices.ts` fetches live CSPX.L price via yahoo-finance2
3. Portfolio metrics are derived **client-side** in `hooks/useMetrics.ts` using helpers from `lib/calculations.ts` and `lib/fifo.ts`
4. Real-time price is managed by `hooks/usePrice.ts`, which calls the `fetchCspxPrice` Convex action

### Auth

GitHub OAuth via `@convex-dev/auth`. Access is restricted to a single authorized account via the `ALLOWED_GITHUB_LOGIN` env var checked in `convex/auth.ts`. Unauthenticated users are redirected to `/sign-in`.

### MCP server

`app/api/mcp/route.ts` exposes an MCP endpoint (Streamable HTTP, via `mcp-handler`) so AI tools can work with transactions. Tools are defined in `lib/mcp/server.ts`:

- `add_purchase` — records a BUY (rejects future dates and identical retries within 60s unless `allowDuplicate`)
- `list_transactions` — all BUYs and SELLs, latest first, with a totals summary
- `list_recent_transactions` — same, limited to the last N months (default 6, Singapore time)
- `get_portfolio_summary` — net units, invested capital, total capital output, fees and average cost, plus market value and returns at the live CSPX.L price (or a given `priceUSD`)

MCP clients have no Convex Auth session, so they authenticate with personal API keys (`Authorization: Bearer yaft_…`), created and revoked from the dashboard's "AI access" dialog. Only a SHA-256 hash of each key is stored (`apiKeys` table). The route passes the raw key to the functions in `convex/mcp.ts`, which resolve it to a user server-side. Shared trade logic (derived fields, validation, listing) lives in `convex/lib/transactions.ts` and is used by both the UI mutations and MCP.

Connect a client, e.g. Claude Code:

```bash
claude mcp add --transport http cspx-tracker https://<host>/api/mcp --header "Authorization: Bearer yaft_…"
```

### Schema

The `transactions` table stores: `userId`, `type` (BUY/SELL), `date`, `priceUSD`, `units`, `transactionCostUSD`, `investedCapitalUSD`, `totalCapitalOutputUSD`, `createdAt`. Indexed by `by_userId` and `by_userId_date`.

The `apiKeys` table stores: `userId`, `name`, `hashedKey`, `prefix`, `createdAt`, `lastUsedAt?`, `revokedAt?`. Indexed by `by_hashedKey` and `by_userId`.

### Key Conventions

- Convex functions in `convex/` export via `api` object — always import from `convex/_generated/api`
- Components are split into `components/dashboard/`, `components/transactions/`, `components/csv/`, and `components/ui/` (shadcn primitives)
- Path alias `@/*` maps to the project root
- **Middleware:** Next.js 16 uses `proxy.ts` (project root) as the middleware entry point — `middleware.ts` is deprecated and must not be used
