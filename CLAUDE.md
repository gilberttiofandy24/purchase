# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An internal tool that replaces a manual spreadsheet for tracking, per store (multiple branches), the weekly purchases made from suppliers, weekly gross/net sales, and weekly labour cost — with totals, percentages, and a purchase-ratio/labour-cost-% breakdown computed server-side.

Two independent apps, no shared code:
- `backend/` — Go + Gin + GORM + PostgreSQL API, JWT-cookie auth.
- `frontend/` — Next.js (App Router) + TanStack Query + shadcn/ui (Radix-based) + Recharts.

## Commands

Backend (`cd backend`):
```
go run .                 # start API (reads .env via godotenv; falls back to localhost defaults)
go build ./...           # compile check
gofmt -l .               # list files needing formatting (gofmt -w to fix)
```
No test suite exists yet.

Frontend (`cd frontend`):
```
bun install
bun run dev              # http://localhost:3000
bun run build             # production build + typecheck (next build runs tsc)
bunx shadcn@latest add <component>   # add a shadcn/ui component (this repo uses --base radix)
```

Local dependencies: PostgreSQL must be running and reachable via `DATABASE_URL` (see `backend/.env.example`). No Docker compose is set up — connect to whatever Postgres instance is configured.

## Backend architecture

Single-binary Gin app, no dependency-injection framework, no repository/service layering — handlers hold a `*gorm.DB` directly and query it inline. Schema is managed by **GORM AutoMigrate** in `internal/db/db.go` (no SQL migration files) — adding/changing a field means updating the struct in `internal/models/models.go` and it auto-migrates on next `go run .`. A default admin user (`admin`/`admin123` unless overridden via env) is seeded on first run if the `users` table is empty.

Auth: `internal/auth/` implements login/logout/me with a JWT stored in an httpOnly cookie (not a header) — `auth.Middleware()` reads the cookie, not `Authorization`. All `/api/*` routes except `/login` and `/logout` require this middleware (wired in `main.go`).

Data model (all in `internal/models/models.go`):
- `Store` — a branch/toko.
- `Supplier` — scoped to one `Store` (`store_id` FK), independent per store.
- `PurchaseEntry` — one row per `(supplier_id, purchase_date)`, upserted via `ON CONFLICT`.
- `GrossSalesEntry` — one row per `(store_id, sales_date)`.
- `WeeklyNetSales` — manually-entered scalar per `(store_id, week_start_date)`, used only for the Purchase Ratio calc.
- `LabourEntry` — one row per `(store_id, entry_date)` holding `staff_count` + `total_hours`; labour cost itself is *not* stored, it's computed on read.

The core endpoint is `GET /api/purchase/weekly-report?store_id=&week_start_date=` (in `internal/handlers/purchase.go`) — `week_start_date` must be a Monday (validated). It fans out to query all four entry tables for that Mon–Sun range, zero-fills missing days, and computes in one pass:
- per-supplier daily amounts, weekly total, and `percentage_of_all` (share of that week's grand total across suppliers)
- `purchase_ratio_pct` = grand total purchase ÷ `WeeklyNetSales.Amount` (the *manual* net sales entry)
- `net_sales_from_gross` = gross sales total ÷ 1.10 (GST-exclusive), used only for labour cost %
- `labour_cost_pct` = weekly labour total ÷ `net_sales_from_gross`
- per-day labour cost = `total_hours × rate × 1.12` (12% super), where `rate` is `weekdayWageRate` (33.05) or `weekendWageRate` (39.66) depending on `time.Weekday()` — these rates are hardcoded constants at the top of `purchase.go`, not configurable per store.

All other writes (`PUT /purchase/entry`, `/gross-sales`, `/net-sales`, `/labour-entry`) are idempotent upserts keyed by the natural unique index (see `clause.OnConflict` calls), matching the frontend's per-cell autosave — the frontend never tracks row IDs for these, only the natural key.

Deleting a `Supplier` (`DELETE /supplier/:id`) cascades to its `PurchaseEntry` rows inside a transaction (no DB-level FK constraints exist, so this cleanup is done in Go, not by the database).

## Frontend architecture

Every data page under `app/(dashboard)/` is a **client component** (`'use client'`) that fetches directly with TanStack Query — there is no server-side prefetch/`HydrationBoundary` pattern here (unlike some other repos in this environment). `app/(dashboard)/layout.tsx` itself calls `GET /me` client-side and redirects to `/login` on failure/401; there's no middleware-based route protection.

`lib/api.ts` is a thin fetch wrapper: every request sends `credentials: 'include'` (the JWT lives in a cookie, not a bearer token) and throws `ApiError` on non-2xx. Per-feature files in `lib/api/*.ts` wrap it with typed functions + a `getXQueryKey()` helper consumed by both the query and its cache invalidation/`setQueryData` calls.

The purchase-report page (`app/(dashboard)/purchase-report/page.tsx`) drives everything off two URL search params, `store_id` and `week` (a Monday date, `yyyy-LL-dd`) — changing store or week pushes a new URL, which changes the TanStack Query key and refetches. `AmountInput` and `LabourDayCell` are uncontrolled-ish input cells keyed by their current value (`key={value}`) so they remount and show the latest server value after a refetch, but save `onBlur` via a mutation that does an **optimistic `setQueryData` recompute** of the whole report shape (totals/percentages/ratios) rather than waiting for a refetch — see the `onMutate` handlers in `PurchaseGrid.tsx`, `GrossSalesRow.tsx`, `NetSalesInput.tsx`, `LabourCostRow.tsx`. If you add a new editable field to the report, follow this same optimistic-recompute pattern rather than just invalidating (invalidating alone causes a visible flash/lag on every keystroke-blur).

`components/ui/*` is unmodified shadcn/ui, initialized with `--base radix` (i.e. real Radix primitives + `asChild`, not the `@base-ui/react` variant some shadcn presets default to) — keep using `asChild` for polymorphic buttons/links, not a `render` prop. `components/ui/form.tsx` was hand-written (the shadcn CLI's `add form` silently no-ops in this environment) — if it ever needs regenerating, write it by hand rather than relying on `shadcn add form`.

The base font is Montserrat, wired via `next/font/google` in `app/layout.tsx` into the CSS var `--font-sans` (which `app/globals.css`'s `@theme inline` block maps to `font-sans`) — don't reintroduce Geist as the sans font without also updating that mapping.

## Route/entity conventions to follow when extending

Adding a new per-store, per-day (or per-week) tracked metric should follow the existing shape exactly: a model with a `uniqueIndex` on `(store_id, date_field)` (or `(supplier_id, date_field)`), a `PUT .../entry`-style upsert handler, inclusion in the `weeklyReportData` struct/response with zero-filled daily maps, and a corresponding frontend `_components/XRow.tsx` with an `onMutate` optimistic updater — this is how `LabourEntry`/`LabourCostRow` was added alongside the original `PurchaseEntry`/`GrossSalesEntry`.
