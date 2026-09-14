# Modelo de datos de la interfaz

El modelo pertenece a `taller-celulares-web`. No se crean entidades ni migraciones en `taller-celulares-api`; los tipos web reproducen respuestas públicas y solicitudes HTTP, sin importar tipos Prisma al navegador ni conectar Next.js a PostgreSQL.

| Tipo | Campos clave | Observación |
|---|---|
| `AuthProfile` | `account`, `workshop` | Solo datos públicos de `GET /auth/me`. |
| `FrontendSession` | ID opaco, tokens, vencimientos | Solo Redis/servidor web; TTL ≤ refresh. El navegador recibe únicamente la cookie con ID opaco. |
| `Page<T>` | `data: T[]`, `meta: {page,limit,total}` | Listas no archivadas. |
| `Client` | ID, nombre, apellido, teléfono, email?, dirección, notas?, `archivedAt` | Taller implícito en la sesión. |
| `Device` | ID, `clientId`, marca, modelo, serie?, color?, condición, `archivedAt` | Cliente debe estar activo al crear. |
| `WorkOrder` | ID, `deviceId`, `number`, problema, diagnóstico?, trabajo?, `status`, importes?, fechas, notas?, `archivedAt` | Importes de respuesta: cadena decimal o `null`; `number` público, no `orderNumber`. |
| `ApiError` | `statusCode`, `code`, `message`, `path`, `details?` | `details` contiene `field` y `message`. |

Los estados son `RECEIVED`, `DIAGNOSING`, `WAITING_PARTS`, `REPAIRING`, `READY`, `DELIVERED`, `CANCELLED`. La UI puede mostrar acciones pertinentes, pero NestJS decide transiciones y archivado. Los detalles de archivados son recuperables por ID; no existe listado/restauración.
