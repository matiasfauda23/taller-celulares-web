# Especificación funcional: Frontend de gestión del taller

**Creada**: 2026-09-14  
**Estado**: Cerrada para revisión previa al plan técnico  
**Fuente de verdad**: API existente en `src/`; este documento no agrega endpoints ni reglas de negocio.

**Ubicación de implementación**: este repositorio independiente `taller-celulares-web`. `taller-celulares-api` permanece intacto como backend y fuente de verdad.

## Objetivo y alcance

El propietario del taller puede registrarse, iniciar y cerrar sesión, consultar un dashboard y gestionar clientes, dispositivos y órdenes de trabajo desde una interfaz responsive. La primera versión utiliza Next.js, TypeScript, Tailwind CSS y shadcn/ui; la organización técnica se definirá en el plan.

Quedan fuera de alcance: cambios al backend, estadísticas dedicadas, restauración de archivados, recuperación de contraseña, roles adicionales y eliminación física.

## Historias y escenarios de aceptación

### H1 — Cuenta y sesión (P1)

1. **Dado** un usuario sin cuenta, **cuando** completa el registro con datos válidos de propietario y taller, **entonces** recibe una sesión y puede acceder al área protegida.
2. **Dado** un usuario registrado, **cuando** inicia sesión con credenciales válidas, **entonces** puede consultar su perfil y los datos de su taller.
3. **Dado** un usuario sin sesión válida, **cuando** intenta acceder al área protegida, **entonces** se le solicita autenticarse sin mostrar datos del taller.
4. **Dado** un token de acceso vencido y una credencial de renovación válida, **cuando** se renueva la sesión, **entonces** la interfaz continúa con los nuevos tokens; si la renovación falla, deja de mostrar datos protegidos y solicita login.
5. **Dado** una sesión activa, **cuando** el usuario cierra sesión, **entonces** la interfaz descarta sus credenciales y deja de mostrar datos protegidos; el cierre de sesión remoto se solicita mediante `POST /auth/logout`.

### H2 — Dashboard (P1)

1. **Dado** un usuario autenticado, **cuando** abre el dashboard, **entonces** ve los totales de clientes activos, dispositivos activos, órdenes no archivadas y órdenes no archivadas en estado `READY`.
2. **Dado** un usuario autenticado, **cuando** usa accesos rápidos, **entonces** puede ir a crear cliente, registrar dispositivo, crear orden o ver todas las órdenes no archivadas.
3. **Dado** que existen órdenes no archivadas, **cuando** abre el dashboard, **entonces** ve una sección breve de órdenes ordenadas por fecha de recepción descendente, sin presentarlas como “últimas creadas”.
4. **Dado** que una consulta del dashboard falla, **cuando** se muestra el resultado, **entonces** no se presenta un cero engañoso para ese dato y se ofrece un estado de error claro.

### H3 — Clientes (P1)

1. **Dado** un usuario autenticado, **cuando** abre clientes, **entonces** puede consultar la lista paginada de activos y abrir el detalle de uno de su taller.
2. **Dado** un formulario válido, **cuando** crea o edita un cliente activo, **entonces** ve el resultado devuelto por la API.
3. **Dado** un cliente activo, **cuando** confirma su archivado, **entonces** se solicita `DELETE /clients/:id` y el registro deja de aparecer en el listado activo si la API acepta la operación.
4. **Dado** un cliente con órdenes activas, **cuando** intenta archivarlo, **entonces** la interfaz conserva el registro y comunica el conflicto devuelto por la API.

### H4 — Dispositivos (P1)

1. **Dado** un usuario autenticado, **cuando** abre dispositivos, **entonces** puede consultar la lista paginada de activos y abrir el detalle de uno de su taller.
2. **Dado** un cliente activo válido, **cuando** crea un dispositivo para él, **entonces** ve el dispositivo creado; si la API rechaza el cliente, se muestra el error.
3. **Dado** un dispositivo activo, **cuando** lo edita, **entonces** solo se envían campos admitidos por la API.
4. **Dado** un dispositivo activo, **cuando** confirma su archivado, **entonces** se solicita `DELETE /devices/:id`; si tiene órdenes activas, se muestra el conflicto sin retirarlo del listado.

### H5 — Órdenes de trabajo (P1)

1. **Dado** un usuario autenticado, **cuando** abre órdenes, **entonces** puede consultar la lista paginada de no archivadas, aplicar los filtros existentes y abrir un detalle.
2. **Dado** un dispositivo activo de un cliente activo, **cuando** crea una orden válida, **entonces** la API crea la orden en estado `RECEIVED` y la interfaz muestra su número público.
3. **Dado** una orden editable, **cuando** cambia sus datos, **entonces** la interfaz usa `PATCH /work-orders/:id` sin enviar `deviceId`, `receivedAt` ni `status`.
4. **Dado** una orden editable, **cuando** solicita un cambio de estado, **entonces** la interfaz usa exclusivamente `PATCH /work-orders/:id/status` y refleja el estado aceptado por la API.
5. **Dado** una transición inválida o sin diagnóstico/trabajo realizado requerido por el backend, **cuando** la API la rechaza, **entonces** el estado visible no cambia y se muestra el error.
6. **Dado** una orden `DELIVERED` o `CANCELLED`, **cuando** el usuario confirma archivarla, **entonces** se solicita `DELETE /work-orders/:id`; para otro estado, el rechazo de la API se muestra sin retirarla del listado.

### H6 — Estados transversales y responsive (P1)

1. **Dado** cualquier consulta o mutación pendiente, **cuando** aún no hay resultado, **entonces** se muestra un estado de carga y se evita enviar accidentalmente la misma operación varias veces.
2. **Dado** un listado exitoso sin elementos, **cuando** se presenta, **entonces** aparece un empty state distinto de un error.
3. **Dado** un error de API, **cuando** llega una respuesta con `code`, `message` y posibles `details`, **entonces** se comunica de forma clara y se conserva la información útil de validación sin exponer secretos.
4. **Dado** una acción de archivado, **cuando** el usuario no la confirma, **entonces** no se envía ninguna solicitud de archivado.
5. **Dado** un ancho móvil o de escritorio, **cuando** se utiliza la interfaz, **entonces** navegación, formularios, listados, acciones y confirmaciones siguen siendo utilizables sin pérdida de funcionalidad.

## Requisitos funcionales y contratos verificados

- **RF-01**: La interfaz DEBE usar `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` y `POST /auth/logout` conforme a sus DTOs. Los endpoints protegidos DEBEN recibir el token de acceso Bearer.
- **RF-02**: La renovación DEBE respetar la rotación de refresh tokens: una credencial reemplazada no debe reutilizarse. La estrategia de almacenamiento y coordinación se resolverá en el plan técnico.
- **RF-03**: Los indicadores del dashboard DEBEN usar `meta.total` de `GET /clients`, `GET /devices`, `GET /work-orders` y `GET /work-orders?status=READY`. Los listados excluyen archivados. No se calcularán totales contando únicamente la página visible.
- **RF-04**: La sección breve de órdenes DEBE usar `GET /work-orders` con un límite válido. El backend ordena por `receivedAt` descendente y luego `id` ascendente.
- **RF-05**: Clientes y dispositivos DEBEN cubrir `GET` lista/detalle, `POST`, `PATCH` y `DELETE` de sus rutas existentes. `DELETE` representa archivado lógico y requiere confirmación.
- **RF-06**: Órdenes DEBEN cubrir `GET` lista/detalle, `POST`, `PATCH` de datos, `PATCH` de estado y `DELETE` de sus rutas existentes. Los filtros disponibles son `status`, `clientId`, `deviceId`, `from`, `to`, `page` y `limit`.
- **RF-07**: La interfaz DEBE tratar al backend como autoridad de validación y reglas de negocio; no debe inventar transiciones, restauración ni nuevos endpoints.
- **RF-08**: Las respuestas de error DEBEN contemplar `statusCode`, `code`, `message`, `path` y `details` opcional; `401`, `409`, `429`, errores de validación y fallas de red deben tener estados comprensibles.
- **RF-09**: Los listados DEBEN respetar la paginación existente (`page` desde 1, `limit` entre 1 y 100; valor predeterminado 20).

## Reglas de dominio relevantes para la interfaz

- Un cliente o dispositivo no puede archivarse si tiene órdenes activas (`RECEIVED`, `DIAGNOSING`, `WAITING_PARTS`, `REPAIRING`, `READY`).
- Una orden solo puede archivarse si está `DELIVERED` o `CANCELLED`; esos estados finales tampoco permiten editarla.
- Transiciones permitidas: `RECEIVED → DIAGNOSING | CANCELLED`; `DIAGNOSING → WAITING_PARTS | REPAIRING | CANCELLED`; `WAITING_PARTS → REPAIRING | CANCELLED`; `REPAIRING → WAITING_PARTS | READY | CANCELLED`; `READY → DELIVERED | REPAIRING`.
- Pasar de `DIAGNOSING` a `WAITING_PARTS` o `REPAIRING` requiere diagnóstico; pasar de `REPAIRING` a `READY` requiere trabajo realizado. El backend valida estas reglas.
- Los detalles por ID pueden devolver registros archivados, pero las listas normales no los incluyen. No habrá vista de restauración.

## Entidades visibles

- **Cuenta y taller**: datos públicos devueltos por autenticación y perfil.
- **Cliente**: identidad, contacto, dirección, notas y fecha de archivado.
- **Dispositivo**: cliente propietario, marca, modelo, número de serie, color, condición física y fecha de archivado.
- **Orden**: dispositivo, número público, problema, diagnóstico, trabajo realizado, estado, importes, fechas, notas y fecha de archivado. Los importes de la respuesta llegan como cadenas decimales o `null`.

## Criterios de cierre de la especificación

- Cada flujo de H1–H6 tiene escenarios verificables para éxito y rechazo.
- Ninguna pantalla requiere datos o operaciones que no exponga la API actual.
- El plan técnico posterior debe resolver almacenamiento/coordinación de sesión, estructura del frontend y pruebas, sin modificar las reglas funcionales aquí definidas.
