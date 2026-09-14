# Contrato UI ↔ BFF ↔ NestJS

El BFF pertenece exclusivamente a `taller-celulares-web` y es una interfaz **interna del frontend**, no un nuevo endpoint NestJS. Solo expone las operaciones documentadas aquí y nunca recibe un destino arbitrario. El contrato entre repositorios es HTTP; Next.js no accede a Prisma ni PostgreSQL.

| Flujo UI | Ruta NestJS existente | Resultado principal |
|---|---|---|
| Registro, login, refresh, logout, perfil | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Perfil y sesión, o error público. |
| Clientes | `GET/POST /clients`, `GET/PATCH/DELETE /clients/:id` | Detalle o `{data,meta}`. `DELETE` archiva. |
| Dispositivos | `GET/POST /devices`, `GET/PATCH/DELETE /devices/:id` | Detalle o `{data,meta}`. `DELETE` archiva. |
| Órdenes | `GET/POST /work-orders`, `GET/PATCH/DELETE /work-orders/:id`, `PATCH /work-orders/:id/status` | Detalle o `{data,meta}`. Estado separado; `DELETE` archiva. |

El BFF traduce la cookie opaca en Bearer solo del lado servidor y usa Redis para la sesión y el lock de refresh. Conservar status y cuerpo público de errores de NestJS; nunca devolver tokens ni stack traces. Confirmar antes de cada `DELETE`; ningún formulario debe enviar campos omitidos por el DTO correspondiente. Dashboard usa listados y `meta.total`; ver [plan.md](../plan.md).
