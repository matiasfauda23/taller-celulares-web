# Plan técnico: frontend de gestión del taller

**Fecha**: 2026-09-14  
**Estado**: Arquitectura aprobada; listo para generar tasks, sin implementación  
**Spec**: [spec.md](spec.md)  
**Backend**: sin cambios

## Decisión principal

Crear un repositorio **independiente** `taller-celulares-web` como aplicación Next.js App Router, TypeScript, Tailwind CSS y shadcn/ui. Usar react-hook-form + Zod para formularios. Next.js funcionará como **BFF**: el navegador solo habla con el origen web; el servidor Next.js conserva los tokens y consume `taller-celulares-api` por HTTP. Redis compartido almacena sesiones y coordina el refresh rotativo. Estas decisiones fueron aprobadas; no se modifica ni el código ni la Constitution del repositorio API.

## Contexto y organización

| Área | Decisión |
|---|---|
| Runtime | Node y pnpm compatibles con Next.js en el nuevo repositorio; se propone alinear con Node `>=24` y pnpm `11.22.0` de la API, fijando versiones exactas al implementar. |
| Rendering | Server Components para lecturas protegidas; Client Components solo para interacción, formularios y diálogos. |
| Datos | `fetch` servidor→NestJS con Bearer y `cache: 'no-store'`; no cachear datos de un taller entre usuarios. |
| Validación | Zod para UX y límites del BFF; NestJS sigue siendo autoridad de DTOs y reglas. |
| Pruebas | Unitarias/componentes, integración BFF con API simulada y E2E de flujos críticos. |

```text
taller-celulares-web/                  # nuevo repositorio, raíz Next.js
  src/app/
    (public)/{login,register}/page.tsx
    (private)/layout.tsx              # navegación y verificación inicial
    (private)/dashboard/page.tsx
    (private)/clients/{page.tsx,new/page.tsx,[id]/page.tsx,[id]/edit/page.tsx}
    (private)/devices/{page.tsx,new/page.tsx,[id]/page.tsx,[id]/edit/page.tsx}
    (private)/work-orders/{page.tsx,new/page.tsx,[id]/page.tsx,[id]/edit/page.tsx}
    api/session/{login,register,refresh,logout}/route.ts
    api/{clients,devices,work-orders}/[...path]/route.ts
  src/features/{auth,dashboard,clients,devices,work-orders}/{components,schemas,api}/
  src/components/ui/                 # shadcn/ui local
  src/components/shared/             # listas, paginación, estados, ArchiveDialog
  src/lib/api/                       # transporte NestJS, DTOs, errores
  src/lib/session/                   # cookie, store, refresh y lock; server-only
  tests/{unit,integration,e2e}/

taller-celulares-api/                  # repositorio actual, independiente
  src/                                 # NestJS existente, sin cambios
  prisma/                              # PostgreSQL existente, sin cambios
```

La spec y este plan son ahora los artefactos de trabajo en `taller-celulares-web/specs/002-frontend-management/`. No se creará `frontend/` dentro de la API ni se modificará su Constitution.

Los layouts agrupan navegación y estructura, no sustituyen controles de seguridad. **Cada lectura o mutación del BFF verifica sesión nuevamente.** Las páginas de detalle archivado solo funcionan con ID conocido: no existe endpoint para listarlos. Compartir tablas, paginación, `EmptyState`, `ErrorState`, encabezados y diálogo de archivado; mantener formularios por dominio para no ocultar diferencias de campos y operaciones.

## API NestJS y BFF

- `NEST_API_URL` es solo del servidor; no exponer tokens ni URL interna mediante `NEXT_PUBLIC_`, HTML o logs. El BFF usa allowlist explícita de métodos/rutas/queries, nunca proxy abierto ni URL aportada por el navegador.
- Las páginas pueden usar funciones servidoras directas; los formularios interactivos llaman rutas BFF del mismo origen. Ambas usan el mismo cliente NestJS, parser de errores y gestor de sesión.
- Se envían solo campos admitidos. Listas conservan `{data, meta}` y filtros en URL (`page`, `limit`; órdenes: `status`, `clientId`, `deviceId`, `from`, `to`). No se suponen relaciones expandidas en las respuestas; datos adicionales se consultan por endpoints existentes.
- Mutaciones exitosas provocan nueva consulta de listas/detalles/dashboard. Sin actualizaciones optimistas para archivado o transiciones. Backend conserva ownership, validación, reglas de estados y borrado lógico.

## Tokens y ciclo de sesión

1. Registro/login: ruta BFF llama a NestJS; recibe cuenta, taller y tokens. Genera ID de sesión aleatorio y guarda tokens en Redis del lado servidor; emite cookie opaca `HttpOnly`, `Secure` en producción, `SameSite=Lax`, `Path=/`, sin `Domain`. El navegador nunca recibe los tokens ni los guarda en `localStorage`/`sessionStorage`. En producción se usa HTTPS y Redis con autenticación, transporte cifrado, acceso privado y cifrado de credenciales en reposo.
2. Solicitud privada: validar cookie y sesión en Redis. Usar access token Bearer; `GET /auth/me` comprueba perfil cuando corresponda. TTL de Redis no excede la expiración real del refresh token. Rotar el ID de sesión al autenticarse. Si Redis no está disponible, fallar de forma cerrada: no asumir sesión válida ni enviar tokens desde el navegador.
3. Access vencido: refrescar **antes** de enviar una solicitud cuando se conoce su expiración. Ante 401 inesperado, refrescar solo si corresponde, y reintentar como máximo una vez una lectura idempotente. No reintentar una mutación si pudo haber llegado al backend y aplicado cambios.
4. Refresh: lock distribuido por sesión en Redis, con lease acotado/renovable y actualización atómica de la entrada; una sola solicitud usa el refresh token anterior, las concurrentes esperan y usan el nuevo par. El lock debe mantenerse hasta confirmar la escritura del sucesor; si se pierde el lock o el resultado del refresh es incierto, se falla de forma cerrada y no se reusa el token anterior. Esto es CRÍTICO: NestJS revoca la sesión si se reutiliza un refresh token rotado.
5. Refresh rechazado con `INVALID_REFRESH_TOKEN`: invalidar sesión del store, borrar cookie en una respuesta que pueda modificarla y enviar a login con aviso de expiración. Red/5xx no implica token inválido: mostrar error recuperable y conservar sesión hasta conocer el estado. Evitar bucles de refresh.
6. Logout: intentar `POST /auth/logout` con access válido (renovarlo primero solo si el refresh es válido y la renovación es segura); invalidar siempre la sesión Redis y borrar cookie, incluso si NestJS no responde. Si la revocación remota falla, registrar el incidente sin secretos y no afirmar que el JWT fue revocado. Un JWT de acceso ya emitido puede seguir válido hasta vencer; NestJS no lo revoca de inmediato.
7. Seguridad: `Origin`/`Host` y protección CSRF para mutaciones del BFF; `SameSite` es defensa adicional, no única. No registrar secretos. Respuestas privadas `no-store`. Limpiar datos cliente al cambiar de cuenta.

**Alternativas**: Una cookie cifrada `HttpOnly` con ambos tokens no requiere Redis ni cambios al backend, pero no coordina de forma fiable refresh entre pestañas/instancias y complica invalidación local; no la recomiendo con rotación estricta. Cambiar NestJS para gestionar cookies `HttpOnly` requeriría modificar login/refresh/logout, CORS y CSRF, y coordinar refresh igualmente. No es necesario para la opción BFF propuesta y queda fuera del alcance actual. [Next.js: autenticación](https://nextjs.org/docs/app/guides/authentication), [OWASP: sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

**Límite residual**: ni Redis puede hacer atómica una respuesta de `POST /auth/refresh` en NestJS y su persistencia posterior en Next.js. Si Next.js cae entre ambos pasos, pierde el token sucesor; no debe reintentar con el anterior porque NestJS lo trataría como reutilización. Debe cerrar esa sesión y pedir login. Eliminar esa ventana exigiría cooperación del backend (por ejemplo, un protocolo de refresh idempotente/acordado), cambio no solicitado. No se promete recuperación transparente ante ese fallo excepcional.

## Errores, loading y empty

| Resultado | UI |
|---|---|
| 400 | `details` por campo cuando existan; conservar entrada; otros 400 como error general. |
| 401 | En login, `INVALID_CREDENTIALS` sin refresh. En recurso privado, refresh controlado si corresponde; si es inválido, terminar sesión. |
| 404 | Estado de recurso no encontrado, sin revelar si existe en otro taller. |
| 409 | Mantener dato anterior; mostrar `message`/`code` de API claramente, especialmente tras archivado o transición. |
| 429 | Mostrar límite temporal; no reintentar login/registro automáticamente. |
| Red/5xx | Error recuperable; no mostrar éxito ni destruir sesión por defecto. |

El parser acepta `statusCode`, `code`, `message`, `path`, `details?` y usa mensaje seguro si el cuerpo no coincide. `loading.tsx`/Suspense para navegación y paneles; estado pending y bloqueo de doble envío para formularios; skeletons estables. `EmptyState` solo tras lista exitosa vacía. Dashboard muestra error independiente por indicador; nunca convierte fallo en `0`.

## Formularios y reutilización

Schemas Zod por operación: registro, login, crear/editar cliente, crear/editar dispositivo, crear/editar orden y cambiar estado. `zodResolver` integra react-hook-form con shadcn/ui. Reflejar longitudes, formato de email/UUID/fecha y decimales de DTOs, sin pretender reemplazar validación del backend. Los importes se capturan como decimal y se convierten explícitamente al número solicitado; las respuestas permanecen como cadenas decimales. Omitir opcionales vacíos en lugar de mandar `null` no admitido. `PATCH` de orden excluye `deviceId`, `receivedAt` y `status`; estado va por endpoint específico. Confirmación de archivado siempre previa; cancelar no envía solicitud. [shadcn/ui: React Hook Form](https://ui.shadcn.com/docs/forms/react-hook-form).

## Dashboard sin endpoints nuevos

Leer `meta.total` de `GET /clients?page=1&limit=1`, `GET /devices?page=1&limit=1`, `GET /work-orders?page=1&limit=5` y `GET /work-orders?page=1&limit=1&status=READY`. La consulta de órdenes con `limit=5` sirve tanto para total como para sección **“Órdenes por fecha de recepción”**. El backend ordena por `receivedAt` descendente e `id` ascendente; no llamar a esto “últimas creadas”. No sumar páginas ni contar solo filas visibles. Los accesos rápidos son navegación interna.

## Verificación antes de entrega

1. Scripts en `taller-celulares-web`: `typecheck`, `lint`, `test`, `build`, `test:e2e`; documentar variables y levantar Next.js, API y Redis en entorno de prueba.
2. Unitarias: serialización, schemas, parser de errores, vencimiento, CSRF, lock/refresh de una sola vez, logout y utilidades de UI.
3. Integración: BFF con API simulada para login, access vencido, refresh inválido, 400/401/404/409/429, dos solicitudes concurrentes y conflicto al archivar.
4. Componentes/E2E: formularios, estados loading/empty/error, navegación privada, dashboard, CRUD, confirmación/cancelación de archivado, cambio de estado y responsive.
5. Desde `taller-celulares-web`, ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`. Verificar integración con la API en su entorno de prueba, pero no modificar configuración ni scripts de `taller-celulares-api`. Registrar resultados reales; aún no se ejecutaron.

## Límite entre repositorios y siguiente fase

La Constitution de `taller-celulares-api` conserva intacto su alcance original: frontend fuera del MVP de la API. `taller-celulares-web` es un producto separado que consume su contrato HTTP, sin acceso directo a PostgreSQL ni Prisma. La spec mantiene trazabilidad; el BFF no reemplaza autorización/ownership de NestJS y no expone secretos.

**Decisiones aprobadas**: BFF Next.js, cookie opaca `HttpOnly`/`Secure` en producción, tokens solo en servidor, Redis compartido, repositorio independiente. No quedan decisiones arquitectónicas bloqueantes identificadas para generar tasks. Las variables de despliegue (URLs, credenciales Redis, dominio HTTPS y proveedor) se concretarán al desplegar; no alteran el contrato funcional.
