# Tasks: 002-frontend-management

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-api.md](contracts/ui-api.md), [quickstart.md](quickstart.md).  
**Repository**: `taller-celulares-web` only. **Status**: planning; no task has been implemented.  
**Rule**: NestJS and its Constitution remain untouched; tests accompany each vertical slice.

## Phase 1 — Setup

**Goal**: a buildable, isolated web project. **Gate**: start no user story before this and Phase 2 pass.

- [x] T001 Initialize Next.js App Router with TypeScript and `src/` at repository root in `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx` and `src/app/page.tsx`; pin compatible Node/pnpm versions in `package.json`.
- [x] T002 Configure Tailwind CSS in `src/app/globals.css` and `postcss.config.mjs`; verify a responsive utility renders in `src/app/page.tsx`.
- [x] T003 Install and configure shadcn/ui with local components in `components.json` and `src/components/ui/`; add Button, Input, Field, Card, Dialog and Skeleton only as needed.
- [x] T004 Configure ESLint, TypeScript strict typecheck, test runner and build scripts in `package.json`, `eslint.config.mjs` and `tsconfig.json`; make `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` runnable.
- [x] T005 Document server-only `NEST_API_URL`, Redis URL/credentials, cookie origin and secret settings in `.env.example` and `README.md`; reject missing production values in `src/lib/config/server-env.ts` without putting secrets in `NEXT_PUBLIC_` variables.
- [x] T006 Set up component/unit, BFF integration and E2E test harnesses in `vitest.config.ts`, `tests/setup.ts` and `playwright.config.ts`, with isolated API/Redis test doubles and `test:e2e` script in `package.json`.

## Phase 2 — Foundation (blocks all stories)

**Goal**: safe server-to-server API access and session primitives independent of a Redis vendor.

- [x] T007 Define public API DTOs, pagination, status and error types from `contracts/ui-api.md` in `src/lib/api/types.ts`; do not import Prisma types.
- [x] T008 Implement the fixed NestJS base URL, endpoint allowlist and no-store server transport in `src/lib/api/nest-client.ts`; never forward arbitrary URLs or tokens to client components.
- [x] T009 Test transport contract for Bearer, allowed paths, no-store and malformed responses in `tests/integration/nest-client.test.ts`; refactor T008 as needed.
- [x] T010 Define a provider-neutral session store interface with get/create/replace/delete/TTL/lock operations in `src/lib/session/store.ts`; keep Redis implementation behind it.
- [x] T011 Implement authenticated/TLS-capable Redis connection, TTL and atomic session operations in `src/lib/session/redis-store.ts`; verify fail-closed behavior when Redis is unavailable in `tests/integration/redis-store.test.ts`.
- [x] T012 Implement random opaque session IDs and `HttpOnly`/production `Secure`/`SameSite=Lax` cookie creation/deletion in `src/lib/session/cookie.ts`; test flags and absence of tokens in `tests/unit/cookie.test.ts`.
- [x] T013 Implement server-only session lookup and protection checks in `src/lib/session/session.ts`; test missing/expired store entries and cookie in `tests/unit/session.test.ts`.
- [x] T014 Implement centralized NestJS error parsing (`statusCode`, `code`, `message`, `path`, `details?`) and safe fallback in `src/lib/api/error.ts`; cover 400/401/404/409/429/network/5xx in `tests/unit/api-error.test.ts`.
- [x] T015 Implement same-origin Origin/Host and CSRF protection for state-changing BFF routes in `src/lib/security/csrf.ts`; test rejection of cross-origin or missing proof in `tests/unit/csrf.test.ts`.
- [x] T016 Create restricted BFF resource route handlers in `src/app/api/clients/[...path]/route.ts`, `src/app/api/devices/[...path]/route.ts` and `src/app/api/work-orders/[...path]/route.ts`; validate method, ID, query and body allowlists and recheck session per call.
- [x] T017 Test BFF allowlists, 401/404 passthrough, secret non-disclosure and cache headers in `tests/integration/resource-proxy.test.ts` before opening feature CRUD work.

## Phase 3 — US1: Account and session (H1, RF-01/RF-02)

**Goal**: register/login, maintain, refresh and close a protected session. **Independent test**: authenticate against mocked NestJS, reload, expire access, refresh once, reject invalid refresh and logout without exposing tokens.

- [ ] T018 [US1] Define Zod/RHF login and register schemas matching auth DTO lengths/normalization in `src/features/auth/schemas/auth.ts`; test valid, invalid and optional cases in `tests/unit/auth-schema.test.ts`.
- [ ] T019 [US1] Implement `POST /auth/login` and `POST /auth/register` BFF handlers in `src/app/api/session/login/route.ts` and `src/app/api/session/register/route.ts`; persist tokens only in Redis and set opaque cookie, returning only public profile/error.
- [ ] T020 [US1] Build login and register forms with react-hook-form, `zodResolver`, shadcn/ui and pending/error states in `src/features/auth/components/login-form.tsx`, `src/features/auth/components/register-form.tsx`, `src/app/(public)/login/page.tsx` and `src/app/(public)/register/page.tsx`.
- [ ] T021 [US1] Implement distributed refresh single-flight with renewable bounded lock, atomic token replacement and fail-closed uncertain outcome in `src/lib/session/refresh.ts`; never retry an ambiguous mutation.
- [ ] T022 [US1] Write integration tests for two concurrent refreshes, access expiry, invalid refresh and uncertain timeout in `tests/integration/refresh.test.ts` using a fake NestJS and shared Redis adapter.
- [ ] T023 [US1] Implement controlled session refresh/logout BFF handlers in `src/app/api/session/refresh/route.ts` and `src/app/api/session/logout/route.ts`; clear Redis and cookie on logout even if NestJS fails, without claiming remote JWT revocation.
- [ ] T024 [US1] Protect `src/app/(private)/layout.tsx` and each BFF operation via `src/lib/session/session.ts`; redirect absent/invalid session, check `GET /auth/me` when profile is required.
- [ ] T025 [US1] Add auth integration/E2E tests for login, register, reload, protected redirect, logout and no browser-token storage in `tests/e2e/auth.spec.ts` and `tests/integration/auth-routes.test.ts`.

## Phase 4 — US2: Dashboard (H2, RF-03/RF-04)

**Goal**: four API-backed counts, short reception-ordered list and quick links. **Independent test**: compare all counts to `meta.total`, fail one metric independently and verify links.

- [ ] T026 [US2] Implement four dashboard reads via existing list endpoints with `page=1`, valid limits and `status=READY` filter in `src/features/dashboard/api/get-dashboard.ts`; reuse work-order response for total plus five rows.
- [ ] T027 [US2] Build cards, reception-date order section and four quick links in `src/features/dashboard/components/dashboard-view.tsx` and `src/app/(private)/dashboard/page.tsx`; never label rows “latest created”.
- [ ] T028 [US2] Test active/non-archived totals, READY filter, independent metric failure and empty order section in `tests/integration/dashboard.test.ts`.

## Phase 5 — US3: Clients (H3, RF-05/RF-09)

**Goal**: list/detail/create/edit/archive clients. **Independent test**: page through active clients, mutate one, cancel archive, then confirm archive and surface 409 unchanged.

- [ ] T029 [US3] Define create/edit client Zod schemas aligned to NestJS DTOs in `src/features/clients/schemas/client.ts`; test field limits in `tests/unit/client-schema.test.ts`.
- [ ] T030 [US3] Implement typed list/detail/create/update/archive API functions in `src/features/clients/api/clients.ts` using the shared BFF routes; preserve `meta` and 409 errors.
- [ ] T031 [US3] Build paginated list and detail pages in `src/app/(private)/clients/page.tsx` and `src/app/(private)/clients/[id]/page.tsx` with `src/features/clients/components/client-list.tsx`.
- [ ] T032 [US3] Build create/edit RHF forms and pages in `src/features/clients/components/client-form.tsx` and `src/app/(private)/clients/new/page.tsx` and `src/app/(private)/clients/[id]/edit/page.tsx`.
- [ ] T033 [US3] Connect confirmed logical archive on detail/list via `src/components/shared/archive-dialog.tsx`; no DELETE on cancel, no optimistic removal on 409.
- [ ] T034 [US3] Cover client CRUD, pagination, archived detail, cancel/confirm and conflict in `tests/e2e/clients.spec.ts`.

## Phase 6 — US4: Devices (H4, RF-05/RF-09)

**Goal**: list/detail/create/edit/archive devices owned by an active client. **Independent test**: select active client, create/edit device, cancel/confirm archive and retain record on 409.

- [ ] T035 [US4] Define create/edit device Zod schemas and client selection constraints in `src/features/devices/schemas/device.ts`; test DTO boundaries in `tests/unit/device-schema.test.ts`.
- [ ] T036 [US4] Implement typed device operations and active-client choices through existing routes in `src/features/devices/api/devices.ts` and `src/features/clients/api/clients.ts`.
- [ ] T037 [US4] Build device list/detail with pagination in `src/app/(private)/devices/page.tsx` and `src/app/(private)/devices/[id]/page.tsx` and `src/features/devices/components/device-list.tsx`.
- [ ] T038 [US4] Build create/edit RHF device form in `src/features/devices/components/device-form.tsx` and `src/app/(private)/devices/new/page.tsx` and `src/app/(private)/devices/[id]/edit/page.tsx`.
- [ ] T039 [US4] Reuse `src/components/shared/archive-dialog.tsx` for device archive and render NestJS 404/409 without removing failed item.
- [ ] T040 [US4] Cover device CRUD, client ownership rejection, archive confirmation/conflict and empty list in `tests/e2e/devices.spec.ts`.

## Phase 7 — US5: Work orders (H5, RF-06/RF-07/RF-09)

**Goal**: list/filter/detail/create/edit/status/archive using only NestJS rules. **Independent test**: create an order, update editable fields, transition through dedicated route and archive only when API accepts.

- [ ] T041 [US5] Define order create/edit/status Zod schemas using DTO fields and decimal conversion in `src/features/work-orders/schemas/work-order.ts`; test omitted optional fields and response decimal strings in `tests/unit/work-order-schema.test.ts`.
- [ ] T042 [US5] Implement typed list/filter/detail/create/update/status/archive operations in `src/features/work-orders/api/work-orders.ts`; status uses `PATCH /:id/status`, edit excludes `deviceId`, `receivedAt`, `status`.
- [ ] T043 [US5] Build paginated/filtered list and detail in `src/app/(private)/work-orders/page.tsx` and `src/app/(private)/work-orders/[id]/page.tsx` and `src/features/work-orders/components/work-order-list.tsx`.
- [ ] T044 [US5] Build create/edit RHF forms and pages in `src/features/work-orders/components/work-order-form.tsx` and `src/app/(private)/work-orders/new/page.tsx` and `src/app/(private)/work-orders/[id]/edit/page.tsx`.
- [ ] T045 [US5] Build dedicated status control in `src/features/work-orders/components/status-action.tsx`; display backend-accepted state and preserve old state on 409.
- [ ] T046 [US5] Reuse `src/components/shared/archive-dialog.tsx` for final-order archive; preserve row and show backend error when not archivable.
- [ ] T047 [US5] Cover filters, CRUD, status route, missing diagnosis/work, final/non-final archive and decimal display in `tests/e2e/work-orders.spec.ts`.

## Phase 8 — US6: Cross-cutting UX (H6, RF-08/RF-09)

**Goal**: all flows distinguish loading, empty, error and usable mobile/desktop. **Independent test**: force each state on each resource and operate without horizontal loss at mobile width.

- [ ] T048 [US6] Consolidate shared `PageHeader`, `Pagination`, `EmptyState`, `ErrorState` and loading skeletons from H2–H5 in `src/components/shared/page-header.tsx`, `src/components/shared/pagination.tsx`, `src/components/shared/empty-state.tsx`, `src/components/shared/error-state.tsx` and `src/components/shared/loading-skeleton.tsx`.
- [ ] T049 [US6] Add route `loading.tsx`/`error.tsx` boundaries in `src/app/(private)/dashboard/`, `src/app/(private)/clients/`, `src/app/(private)/devices/` and `src/app/(private)/work-orders/`; retain independent dashboard metric failures.
- [ ] T050 [US6] Map NestJS validation `details` to RHF fields and general 400/401/404/409/429/network states in `src/lib/api/present-error.ts` and `src/components/shared/api-error-alert.tsx`.
- [ ] T051 [US6] Implement responsive navigation, tables/card fallback, form spacing and accessible dialogs in `src/app/(private)/layout.tsx`, `src/app/globals.css` and `src/components/shared/`.
- [ ] T052 [US6] Test loading, empty/error, keyboard focus, duplicate-submit blocking and mobile/desktop viewport flows in `tests/e2e/states-responsive.spec.ts`.

## Phase 9 — Verification and handoff

- [ ] T053 Run and fix `pnpm typecheck` in `taller-celulares-web/tsconfig.json` and affected source files; record exact result in `specs/002-frontend-management/verification.md`.
- [ ] T054 Run and fix `pnpm lint` in `taller-celulares-web/eslint.config.mjs` and affected source files; record exact result in `specs/002-frontend-management/verification.md`.
- [ ] T055 Run `pnpm test`, `pnpm test:e2e` and `pnpm build`, fixing failures in their owning work units and recording results in `specs/002-frontend-management/verification.md`.
- [ ] T056 Audit browser storage, HTML and logs for token leakage; review Redis fail-closed and refresh-crash limits against `specs/002-frontend-management/plan.md`, recording evidence in `specs/002-frontend-management/verification.md`.

## Dependencies and parallel work

- Setup T001–T006 → Foundation T007–T017 → US1 T018–T025. H2–H5 depend on protected session/BFF; each story supplies its local loading/empty/error UI before H6 consolidates shared components; H2 dashboard and H3 clients can proceed independently after US1. H4 needs active-client choices from H3. H5 needs device choices from H4. H6 shared states can begin after Foundation but integration completion follows H2–H5. Verification is last.
- Parallel opportunities after Foundation: dashboard API/test (T026/T028) and client schema/test (T029); independent schema/test pairs for devices/orders after their upstream API choices; responsive audit alongside feature polishing. `[P]` is omitted where these concrete dependencies or shared files make independent concurrent edits unsafe.
- Suggested first deliverable: Setup + Foundation + US1 (working authenticated shell). Do not treat it as the full user-approved feature.
