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
npm run dev       # Start Next.js dev server (also starts Convex in watch mode)
npm run build     # Production build
npm run lint      # Run ESLint
npx convex dev    # Start Convex backend separately (if needed)
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

### Schema

The `transactions` table stores: `userId`, `type` (BUY/SELL), `date`, `priceUSD`, `units`, `transactionCostUSD`, `investedCapitalUSD`, `totalCapitalOutputUSD`, `createdAt`. Indexed by `by_userId` and `by_userId_date`.

### Key Conventions

- Convex functions in `convex/` export via `api` object — always import from `convex/_generated/api`
- Components are split into `components/dashboard/`, `components/transactions/`, `components/csv/`, and `components/ui/` (shadcn primitives)
- Path alias `@/*` maps to the project root
