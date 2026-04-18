# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Indian stock market sentiment & trading terminal built on the Fyers API.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: SQLite (`better-sqlite3`) — file at `artifacts/api-server/data/market.db`, WAL mode
- **Build**: esbuild (ESM bundle)

## Artifacts

- **api-server** — Express 5 backend at port 8080, mounted under `/api`
  - Fyers OAuth: `GET /api/fyers/auth`, `GET /api/fyers/callback`
  - Dashboard data: `GET /api/fyers/dashboard-data` (unified compute endpoint)
  - Market data: quotes, positions, funds, orders, holdings via Fyers API
  - Alerts CRUD: `/api/alerts`
  - Watchlist CRUD: `/api/watchlist`
  - Orders log: `GET /api/orders`
  - Backtests: `GET /api/backtests`, `GET /api/backtests/:id`
  - DB stats: `GET /api/db/stats`
  - Secrets: `FYERS_APP_ID`, `FYERS_SECRET_KEY`, `SESSION_SECRET`

- **india-market-dashboard** — React + Vite dark terminal aesthetic at `/`
  - Dark theme: neon #00e676 green, #ff1744 red, #ffea00 yellow, #40c4ff blue
  - Shows mock data when unauthenticated, live Fyers data when logged in
  - Auto-refreshes every 30s; all 5 analysis cards + decision panel powered by `/api/fyers/dashboard-data`
  - Components: TickerBar, DecisionPanel, VolatilityCard, TrendCard, BreadthCard, MomentumCard, MacroCard, ExecutionWindow, SectorPerformance, ScoringWeights, TopStocks, AlertsFeed

## SQLite Schema (data/market.db)

| Table              | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `tokens`           | Persisted Fyers access token (survives restart) |
| `ohlcv_cache`      | Cached daily OHLCV candles (reduces Fyers API calls) |
| `quote_snapshots`  | Live quote snapshots saved on each dashboard fetch |
| `watchlist`        | User's watchlist of symbols               |
| `screener_criteria`| Saved screener configurations             |
| `screener_results` | Screener match results                    |
| `backtest_runs`    | Backtest run metadata + results           |
| `backtest_trades`  | Individual trades from backtest runs      |
| `alerts`           | Price/indicator alerts                    |
| `orders`           | Order history (live + paper)              |

## Key Backend Files

- `src/lib/db.ts` — SQLite setup, schema migration, typed helper functions
- `src/lib/fyersCompute.ts` — Dashboard scoring engine with OHLCV cache
- `src/lib/fyersData.ts` — Fyers API wrappers (quotes, history, funds, etc.)
- `src/lib/fyersAuth.ts` — OAuth flow
- `src/routes/fyers.ts` — All API routes

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run API server (build + start)
- `pnpm run typecheck` — full typecheck across all packages
