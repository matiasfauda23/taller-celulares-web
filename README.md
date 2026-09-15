# taller-celulares-web

Independent Next.js frontend and BFF for `taller-celulares-api`. Feature planning lives in `specs/002-frontend-management/`. Phase 1 only is implemented; no authentication or backend access is wired yet.

## Local setup

Requires Node.js 24 and pnpm 11.22.0. Run `pnpm install`, then `pnpm dev` (web default port 3000). The NestJS API also defaults to 3000; use a different web port, for example `pnpm exec next dev -p 3001`, and keep `APP_ORIGIN` aligned. Copy `.env.example` to `.env.local` only when API and Redis work begins. Never commit real secrets.

## Phase 1 checks

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e`. The E2E smoke test starts the web server itself; browser installation may require `pnpm exec playwright install chromium`.

This repo has no GitHub remote configured.
