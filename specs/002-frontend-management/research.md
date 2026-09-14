# Investigación y decisiones

## BFF y sesión

**Decisión aprobada**: Next.js BFF con cookie opaca `HttpOnly` (`Secure` en producción), tokens solo en Redis del lado servidor y lock distribuido para refresh. **Por qué**: el backend devuelve tokens en JSON y revoca la sesión ante reutilización de refresh; el navegador no debe leer credenciales y varias instancias necesitan coordinar la rotación. **Alternativas descartadas**: tokens en `localStorage`/`sessionStorage` (exposición a XSS), cookie cifrada con tokens (concurrencia problemática), cookies gestionadas por NestJS (cambia backend). [Next.js](https://nextjs.org/docs/app/guides/authentication), [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Componentes y formularios

**Decisión**: App Router con Server Components para lectura y Client Components para interacción; react-hook-form con Zod por operación. **Por qué**: permite mantener secretos en servidor y formularios accesibles sin replicar lógica de negocio. **Alternativa**: SPA que llama directamente a NestJS, rechazada por exposición de tokens al JavaScript. [Next.js](https://nextjs.org/docs/app/getting-started/server-and-client-components), [shadcn/ui](https://ui.shadcn.com/docs/forms/react-hook-form).

## Datos y caché

**Decisión**: cliente NestJS `server-only`, peticiones privadas `no-store`, invalidación tras mutaciones. **Por qué**: evitar mezclar datos entre cuentas y mostrar datos actualizados. [Next.js fetch](https://nextjs.org/docs/app/api-reference/functions/fetch).

## Separación de repositorios

**Decisión aprobada**: `taller-celulares-web` es un repositorio Next.js separado de `taller-celulares-api`. El primero posee BFF y Redis; el segundo conserva NestJS, Prisma, PostgreSQL, ownership y reglas. La Constitution de la API no cambia. **Alternativa descartada**: subdirectorio `frontend/` en la API, porque mezcla ciclos de vida y contradice la preferencia explícita del usuario.
