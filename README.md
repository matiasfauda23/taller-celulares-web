# taller-celulares-web

Frontend y BFF en Next.js para `taller-celulares-api`. Gestiona el taller de reparación: panel, clientes, dispositivos y órdenes de trabajo. La planificación vive en `specs/002-frontend-management/`; el estado de verificación y sus gates, en `specs/002-frontend-management/verification.md`.

## Configuración local

Requiere Node.js 24 y pnpm 11.22.0. Copiar `.env.example` a `.env.local` y completar `NEST_API_URL`, `APP_ORIGIN`, `REDIS_URL` y secretos. Nunca commitear secretos reales.

```bash
pnpm install
pnpm dev          # next dev -p 3001
```

Requiere además la API (`taller-celulares-api`) levantada en `http://localhost:3000` y Redis disponible en `REDIS_URL` (por defecto `redis://127.0.0.1:6379`).

## Verificación

```bash
pnpm typecheck
pnpm lint
pnpm test          # unit/integration (Vitest)
pnpm test:e2e      # Playwright: levanta el build de producción en el puerto 3001
pnpm build
```

El E2E arranca su propio servidor `next build && next start -p 3001`; puede requerir `pnpm exec playwright install chromium`.