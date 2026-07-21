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
- `Employee` — scoped to one `Store`, same shape as `Supplier` (name/sort_order/is_active). Mirrors the Supplier pattern deliberately — copy that pattern, not the LabourEntry one, when touching this.
- `LabourHourEntry` — one row per `(employee_id, entry_date)` holding `total_hours`; mirrors `PurchaseEntry`. Labour cost itself is *not* stored, it's computed on read from the per-day sum across employees.
- `WeeklyLabourRate` — manually-entered `weekday_rate`/`weekend_rate` per `(store_id, week_start_date)`, mirrors `WeeklyNetSales`. This is the **gross rate** (already includes superannuation) used directly in the labour cost formula — not a base wage that gets multiplied further.

The core endpoint is `GET /api/purchase/weekly-report?store_id=&week_start_date=` (in `internal/handlers/purchase.go`) — `week_start_date` must be a Monday (validated). It fans out to query suppliers/purchases, gross sales, net sales, employees/labour-hours, and the applicable labour rate for that Mon–Sun range, zero-fills missing days, and computes in one pass:
- per-supplier daily amounts, weekly total, and `percentage_of_all` (share of that week's grand total across suppliers)
- per-employee daily hours, weekly total hours, and `percentage_of_all` (share of that week's total hours across employees) — same shape as the supplier rows, exposed as `employees` in the response
- `purchase_ratio_pct` = grand total purchase ÷ `WeeklyNetSales.Amount` (the *manual* net sales entry)
- `net_sales_from_gross` = gross sales total ÷ 1.10 (GST-exclusive), used only for labour cost %
- `labour_cost_pct` = weekly labour total ÷ `net_sales_from_gross`
- per-day labour cost = `(sum of that day's hours across all employees) × rate`, where `rate` is the resolved `weekday_rate` or `weekend_rate` depending on `time.Weekday()`. The rate is resolved by looking up `WeeklyLabourRate` for `store_id` + the closest `week_start_date <= this week` (i.e. **carries forward** from the last week a rate was set for that store — a store doesn't need a rate entered every week); if none has ever been set, it falls back to `fallbackWeekdayRate`/`fallbackWeekendRate` constants in `purchase.go`. The resolved rates are echoed back in the response as `weekday_rate`/`weekend_rate` so the frontend can reuse them for optimistic recompute without hardcoding. `staff_count` for a day in `labour_daily` is *derived* (count of employees with hours > 0 that day), not a stored field.

All other writes (`PUT /purchase/entry`, `/gross-sales`, `/net-sales`, `/labour/hour-entry`, `/labour/rate`) are idempotent upserts keyed by the natural unique index (see `clause.OnConflict` calls), matching the frontend's per-cell autosave — the frontend never tracks row IDs for these, only the natural key.

Deleting a `Supplier` (`DELETE /supplier/:id`) cascades to its `PurchaseEntry` rows, and deleting an `Employee` (`DELETE /employee/:id`) cascades to its `LabourHourEntry` rows, both inside a transaction (no DB-level FK constraints exist, so this cleanup is done in Go, not by the database).

## Frontend architecture

Every data page under `app/(dashboard)/` is a **client component** (`'use client'`) that fetches directly with TanStack Query — there is no server-side prefetch/`HydrationBoundary` pattern here (unlike some other repos in this environment). `app/(dashboard)/layout.tsx` itself calls `GET /me` client-side and redirects to `/login` on failure/401; there's no middleware-based route protection.

`lib/api.ts` is a thin fetch wrapper: every request sends `credentials: 'include'` (the JWT lives in a cookie, not a bearer token) and throws `ApiError` on non-2xx. Per-feature files in `lib/api/*.ts` wrap it with typed functions + a `getXQueryKey()` helper consumed by both the query and its cache invalidation/`setQueryData` calls.

The purchase-report page (`app/(dashboard)/purchase-report/page.tsx`) and the labour-cost page (`app/(dashboard)/labour-cost/page.tsx`) both drive everything off two URL search params, `store_id` and `week` (a Monday date, `yyyy-LL-dd`) — changing store or week pushes a new URL, which changes the TanStack Query key and refetches. Both pages call the same `GET /purchase/weekly-report` endpoint; labour cost was split into its own route/page (rather than staying a row on purchase-report) because it's gated behind `LabourOtpGate` — a client-side dialog that POSTs a 6-digit code to `/labour/verify-otp` (checked against the `LABOUR_OTP_CODE` env var) and, once correct, sets a `sessionStorage` flag so the gate doesn't re-prompt for the rest of the browser session. `LabourGrid.tsx` mirrors `PurchaseGrid.tsx` exactly (per-employee rows instead of per-supplier), including the inline "add employee" row (calls `createEmployee`, same as the grid's inline "add supplier" calls `createSupplier`). `AmountInput` and `HourInput` are uncontrolled-ish input cells keyed by their current value (`key={value}`) so they remount and show the latest server value after a refetch, but save `onBlur` via a mutation that does an **optimistic `setQueryData` recompute** of the whole report shape (totals/percentages/ratios) rather than waiting for a refetch — see the `onMutate` handlers in `PurchaseGrid.tsx`, `GrossSalesRow.tsx`, `NetSalesInput.tsx`, `LabourGrid.tsx`. If you add a new editable field to the report, follow this same optimistic-recompute pattern rather than just invalidating (invalidating alone causes a visible flash/lag on every keystroke-blur).

`components/ui/*` is unmodified shadcn/ui, initialized with `--base radix` (i.e. real Radix primitives + `asChild`, not the `@base-ui/react` variant some shadcn presets default to) — keep using `asChild` for polymorphic buttons/links, not a `render` prop. `components/ui/form.tsx` was hand-written (the shadcn CLI's `add form` silently no-ops in this environment) — if it ever needs regenerating, write it by hand rather than relying on `shadcn add form`.

The base font is Montserrat, wired via `next/font/google` in `app/layout.tsx` into the CSS var `--font-sans` (which `app/globals.css`'s `@theme inline` block maps to `font-sans`) — don't reintroduce Geist as the sans font without also updating that mapping.

## Route/entity conventions to follow when extending

Adding a new per-store, per-day (or per-week) tracked metric should follow the existing shape exactly: a model with a `uniqueIndex` on `(store_id, date_field)` (or `(supplier_id, date_field)`), a `PUT .../entry`-style upsert handler, inclusion in the `weeklyReportData` struct/response with zero-filled daily maps, and a corresponding frontend `_components/XRow.tsx` with an `onMutate` optimistic updater — this is how `GrossSalesEntry`/`GrossSalesRow` was added alongside the original `PurchaseEntry`/`PurchaseGrid`.

Adding a new per-store *roster* entity (things people, not dates — like `Supplier` or `Employee`) that gets its own per-day entry table should instead mirror the `Supplier`+`PurchaseEntry`+`PurchaseGrid` trio directly: a roster model (`store_id`, `name`, `sort_order`, `is_active`), a per-`(roster_id, date)` entry model with `ON CONFLICT` upsert, a `store/[id]/<roster>/` CRUD page + dialog (copy `store/[id]/supplier/`), and a `<Roster>Grid.tsx` with one row per roster item, day columns, and an inline "add" row — this is how `Employee`/`LabourHourEntry`/`LabourGrid` was added.

`LabourGrid` and `HourInput` live under `app/(dashboard)/labour-cost/_components/`, not `purchase-report/_components/` — labour cost has its own OTP-gated page, so don't recreate labour components under purchase-report.
