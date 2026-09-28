# Verification: 002-frontend-management

Final gates (Phase 9) for the frontend-management spec, recorded after the complete vertical slices landed (US4 devices, US5 work orders, US6 cross-cutting UX).

## Environment used for verification

- Host: WSL2 (Ubuntu) on Windows; runner scripts use `node v24.17.0` / `pnpm 11.22.0`.
- Web app: Next.js `16.3.5`, TypeScript, Tailwind + shadcn/ui, Vitest `5.0.0`, Playwright `1.63.0`.
- API: NestJS + Prisma `7.10.0` on `http://localhost:3000`.
- Data stores (local, no vendor dependency): PostgreSQL `18.6` cluster `18/main` on `localhost:5432` (database `taller_celulares`, role `taller_celulares_user`); Redis `127.0.0.1:6379` (`PING` → `PONG`).
- Schema applied with `pnpm prisma:migrate:deploy` (migrations `20260827201404_authentication`, `20260828203000_domain_mvp`).

> The original Render PostgreSQL instance expired ("Free database expired"), so no produccion-like remote DB was used. All gates below run against the local PostgreSQL described above and are repeatable offline.

## T053 — `pnpm typecheck` (exact result)

Command: `tsc --noEmit`.

- Exit code: `0`.
- No errors emitted. Type definitions shared across `src/lib/api/types.ts`, BFF route handlers and feature API wrappers type-check against the NestJS contract without importing Prisma types.

## T054 — `pnpm lint` (exact result)

Command: `pnpm lint` (ESLint flat config).

- Exit code: `0` (no `error` severity).
- Warning count: `12`, all pre-existing `@typescript-eslint/no-unused-vars` on `error.tsx` boundary props (`_error`, `_reset`) and two unused client-form type aliases (`DeviceFormValues`, `mode`). No warnings come from user-visible behavior or shipping logic; they were left untouched to avoid churn in files with no behavioural defect.
- One `@next/next/no-html-link-for-pages` error found and fixed during this session in `src/features/work-orders/components/work-order-filters.tsx` ("Limpiar" switched from `<a href>` to `next/link` `<Link>`).

## T055 — `pnpm test`, `pnpm test:e2e`, `pnpm build`

### Unit/integration (`pnpm test`)

- Result: **151 passed** across **18 test files** (`18 files | 151 tests`, duration ≈ 11 s).
- Notable suites: `tests/unit/server-env.test.ts` now also covers the explicit `APP_ALLOW_INSECURE_ORIGIN` opt-in that lets a plain-HTTP `APP_ORIGIN` pass only in `production` when explicitly enabled; `tests/integration/refresh.test.ts` covers concurrent single-flight refresh, access expiry and the uncertain-timeout bound.

### E2E (`pnpm test:e2e`)

Command: `pnpm exec playwright test tests/e2e/devices.spec.ts tests/e2e/work-orders.spec.ts tests/e2e/states-responsive.spec.ts` (1 worker, web server = `pnpm build && next start -p 3001`).

- Result: **22 passed** (≈ 51 s run).
  - `devices.spec.ts` 7/7: redirect unauthenticated; list empty → create → edit for a real client; visible 404; cancel archive (no request) then confirm; NestJS 409 keeps record active; archived client rejection; backend pagination.
  - `work-orders.spec.ts` 8/8: redirect; create+edit through the form; decimal strings preserved; full lifecycle through the status control; visible 404; non-final archive refused; final archive confirmed; status filter + pagination carries the filter; unknown `status=NOT_A_STATUS` in URL is ignored and the list renders (assertion scoped to `<main>` because Next.js mounts an empty `role="alert"` route announcer in `<body>`).
  - `states-responsive.spec.ts` 7/7: list skeleton; recoverable mutation error keeps session; duplicate submit blocked; archive dialog keyboard-only; table→cards at mobile breakpoint; mobile nav usable closed; responsive breakpoints.
- One test defect fixed during this session: the unknown-status test asserted `getByRole("alert")` globally, which counts Next.js's built-in route announcer node; the assertion is now scoped to `main`.

### Build (`pnpm build`)

- `next build` completes successfully; the E2E web server step (`pnpm build && next start -p 3001`) is part of every `test:e2e` run, so the gate is exercised per run.
- In `production`, `src/lib/config/server-env.ts` rejects a plain-HTTP `APP_ORIGIN` unless `APP_ALLOW_INSECURE_ORIGIN=true` is explicitly set (verification-only escape hatch, covered by `tests/unit/server-env.test.ts`).

## T056 — Token-leakage and resilience audit

### Browser storage / HTML / logs

- `grep` for `localStorage` and `sessionStorage` across `src/` → **no matches**: the app never persists credentials in browser storage.
- Views never hold tokens: BFF handlers (`src/app/api/session/*`, resource proxies) persist tokens only server-side in Redis and send back public profiles; `tests/e2e/auth.spec.ts` asserts login/register/reload/logout flows and the absence of browser-token storage; `tests/integration/resource-proxy.test.ts` covers secret non-disclosure.
- Cookies: session cookie is opaque (`src/lib/session/cookie.ts`) with `HttpOnly` and `SameSite=Lax`, `Secure` in production, verified in `tests/unit/cookie.test.ts`.
- `.env.example` leads with: "Server-only settings; never use NEXT_PUBLIC_ for tokens or Redis credentials." No `NEXT_PUBLIC_*` values exist in source (only that comment).
- `src/lib/config/server-env.ts` fails closed when `SESSION_COOKIE_SECRET` is missing or < 32 chars, and requires `APP_ORIGIN`/`NEST_API_URL` to be valid URLs.

### Redis fail-closed

- `src/lib/session/redis-store.ts` treats Redis unavailability as a missing/failed session (no graceful degradation), verified in `tests/integration/redis-store.test.ts`.

### Refresh-crash limits

- `src/lib/session/refresh.ts` implements distributed single-flight refresh backed by a renewable bounded lock; a caller that times out waiting for the lock holder returns a fail-closed uncertain outcome and is never retried for an ambiguous mutation. Bounds are covered in `tests/integration/refresh.test.ts` (concurrent refreshes, access expiry, invalid refresh, uncertain timeout).

## Result

All Phase 9 gates pass: **typecheck 0 errors, lint 0 errors, unit 151/151, E2E 22/22, production build green**, token-leak/resilience audit clean. Tasks T035–T056 are marked complete in `tasks.md`.