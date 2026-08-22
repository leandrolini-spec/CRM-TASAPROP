---
name: verify
description: "Versión de proyecto del skill global 'verify' — verifica que un cambio realmente hace lo que debía, ejecutándolo de punta a punta contra producción (no solo tests o typecheck) antes de dar el cambio por terminado. Si el trabajo viene de un design-plan, el plan con la lista de tareas está en docs/plans/YYYY-MM-DD-titulo.md — usalo para chequear que cada tarea quedó cubierta."
metadata:
  version: 1.0.0
---

# Verify — tasaprop-crm

Antes de dar por terminado un cambio no trivial, ejercitalo de verdad — no alcanza con que tipee bien o que el build pase. Mismo criterio que el skill global `verify`: manejá el flujo afectado en la app real y observá el comportamiento real, no solo el código.

## Si el cambio viene de un `design-plan`

El plan con la lista de tareas está en `docs/plans/YYYY-MM-DD-titulo.md` (mismo slug que el spec correspondiente en `docs/specs/`). Antes de verificar, releelo y confirmá tarea por tarea de la sección "Lista de tareas a implementar" que:

- Está efectivamente implementada
- Se comporta como describe el "Comportamiento esperado" del spec referenciado (no solo como quedó redactada la tarea)

Si encontrás una tarea del plan que no se hizo o quedó a medias, decilo explícitamente en vez de reportar el cambio como completo.

## Cómo verificar en este proyecto

- **Chequeos estáticos, siempre antes de desplegar**: `npx tsc --noEmit` y `npx eslint src` (o los archivos tocados) limpios, y `npm run build` local exitoso.
- **Verificación en vivo, después de cada deploy**: este proyecto se despliega a Vercel (`npx vercel deploy --prod --yes`, en background, taileando el log hasta `readyState: READY`) y se verifica contra la URL real de producción (`https://tasaprop-crm.vercel.app`), no en localhost — no hay ambiente de staging separado.
  - Para probar **autenticado** contra datos reales: usar la sesión ya logueada del usuario vía `mcp__claude-in-chrome__*` (el navegador real del usuario) cuando esté disponible, o el navegador sandbox (`mcp__Claude_Browser__*`) si hace falta una sesión aislada.
  - Para probar una pantalla **sin sesión** (ej. login) o algo que necesita bypasear el gate de acceso: usar el navegador sandbox con `?ta=<SITE_ACCESS_KEY>` (la key está en `.env.local`), nunca hardcodear la key en el código ni en un archivo commiteado.
  - Si hace falta ver algo que normalmente requiere estar logueado pero no hay sesión disponible, se puede armar una ruta temporal `/preview-*` (con su exención correspondiente en `isPublicPath` de `src/lib/supabase/middleware.ts`) — **siempre borrar la ruta y la exención al terminar**, no dejarlas en el repo.
- **Cambios que tocan datos reales** (togglear un checkbox, marcar algo como transferido, mover una tarjeta de Seguimiento, etc.): después de confirmar que el comportamiento es correcto, revertir la mutación de prueba con SQL directo (Supabase MCP `execute_sql`) para no dejar el dato de prueba pisando información real del usuario.
- **Cambios de RLS o políticas de Supabase**: la causa más común de "el cambio no se guarda" en este proyecto ha sido una política de UPDATE/DELETE faltante en la tabla — si un toggle/guardado parece funcionar en la UI pero no persiste tras recargar, sospechar primero de RLS antes de asumir un bug de React.
- **Cambios visuales/de diseño**: comparar contra el manual de marca de Tasaprop (ver memoria del proyecto) y revisar tanto desktop como el viewport angosto (mobile) con `resize_window`.

## Al terminar

Reportá qué se verificó y cómo (no solo "listo, funciona"). Si algo del plan quedó sin cubrir o el comportamiento no coincide con el spec, decilo antes de sugerir que el cambio está terminado.
