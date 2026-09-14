# Guía de verificación propuesta

**Estado**: comandos para ejecutar después de implementar; no son evidencia de ejecución.

## Preparación

1. Clonar `taller-celulares-api` y el futuro `taller-celulares-web` por separado. Configurar NestJS con PostgreSQL de prueba; no modificar el backend. El BFF usa conexión servidor-servidor, por lo que no depende de permitir el origen del navegador en CORS.
2. En el repositorio web configurar `NEST_API_URL`, URL de Redis y origen público HTTPS. Nunca exponer secretos con `NEXT_PUBLIC_`.
3. Iniciar API, Redis y frontend como servicios separados.

## Checks automatizados

```bash
cd taller-celulares-web
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

## Recorrido manual mínimo

1. Registrar taller, recargar y verificar sesión; logout oculta datos.
2. Crear cliente, dispositivo y orden; editar cada uno; cambiar estado por operación dedicada.
3. Ver dashboard: cuatro indicadores coinciden con `meta.total`, sección ordenada por recepción.
4. Cancelar archivado: no hay solicitud. Confirmar archivado permitido: desaparece del listado activo. Provocar `409`: mostrar error sin perder dato.
5. Simular access vencido, refresh inválido, 400/404/429, lista vacía y falla de red; verificar estados diferenciados.
6. Revisar ancho móvil y escritorio, navegación por teclado y ausencia de tokens en HTML, almacenamiento web y logs.
