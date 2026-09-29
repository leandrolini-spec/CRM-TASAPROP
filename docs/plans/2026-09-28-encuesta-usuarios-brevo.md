# Encuesta de retención a usuarios de TasaProp — plan técnico

## 1. Objetivo

Construir una página pública de encuesta tipo wizard (identificada por email vía la URL, sin login), un mecanismo para mandarla por Brevo desde la pestaña Usuarios del CRM (con tanda de prueba primero), y una vista de resultados para que Leandro revise las respuestas y active la semana gratis a mano.

## 2. Contexto del problema

TasaProp tiene retención baja y no se sabe por qué (precio, dificultad, tasación no coincide con lo esperado, funcionalidad). Ya existe la tabla `usuarios_app` (556 registros, nombre + email) cargada para este fin. Falta: la encuesta en sí, el envío masivo vía Brevo, y dónde ver quién respondió qué.

## 3. Spec de referencia

`docs/specs/2026-09-28-encuesta-usuarios-brevo.md`

Una precisión técnica que el spec no detalla: el envío real de correos en este proyecto **no usa el sistema de "Campañas" nativo de Brevo con merge tags** — se manda por la API transaccional de Brevo (`/smtp/email`), un correo por destinatario, con el HTML ya armado del lado del servidor (ver `src/lib/brevo/client.ts` y `src/app/api/campanas/[id]/enviar/route.ts`). El "link personalizado" de la Alternativa 1 elegida en brainstorming se logra igual, pero armando la URL con el email ya del lado de nuestro propio código (`?email=...`), exactamente como ya se hace hoy con el link de baja (`/baja?email=...`). No hace falta ninguna configuración especial en Brevo.

## 4. Lista de tareas

### Tarea 1 — Migración de base de datos

Crear:
- Tabla `encuesta_respuestas`: `id uuid pk`, `usuario_id uuid references usuarios_app(id) on delete set null`, `email text not null`, `frecuencia_uso text not null`, `motivo_abandono text[] not null default '{}'`, `motivo_otro text`, `percepcion_precio text`, `precio_dispuesto text`, `tasacion_precision text`, `whatsapp text`, `comentario text`, `created_at timestamptz not null default now()`.
- RLS en `encuesta_respuestas`: solo `select` para `is_team_member()`. **A propósito no hay policy de `insert` pública** — la escritura pasa únicamente por la función de la Tarea 2, que hace `security definer`.
- Columnas nuevas en `usuarios_app`: `encuesta_enviada_at timestamptz`, `encuesta_respondida_at timestamptz`.

**Verificación**: `select` a las tablas desde el SQL editor de Supabase confirma las columnas; un `insert` directo a `encuesta_respuestas` con la key anon (sin sesión) debe fallar por RLS.

### Tarea 2 — Función `guardar_respuesta_encuesta` (SECURITY DEFINER)

Función Postgres que recibe las respuestas + el email, busca el `usuario_id` correspondiente en `usuarios_app` (por email, case-insensitive), inserta la fila en `encuesta_respuestas`, y si encontró usuario le actualiza `encuesta_respondida_at = now()`. `grant execute` a `anon` y `authenticated` — este es el mecanismo que permite guardar la respuesta desde la página pública sin sesión, siguiendo el mismo patrón que `baja_contacto`/`registrar_evento_brevo` ya usados en `/baja` y `/api/webhooks/brevo`.

**Verificación**: llamar la función vía `execute_sql` con un email de prueba y confirmar que aparece la fila en `encuesta_respuestas` y que `usuarios_app.encuesta_respondida_at` se actualizó para ese email.

### Tarea 3 — Eximir `/encuesta` de los gates del middleware

En `src/lib/supabase/middleware.ts`: agregar `/encuesta` a la lista de `siteIsGated` (junto a `/baja` y `/api/webhooks/`) y a `isPublicPath` (junto a `/login` y `/baja`) — sin esto, cualquiera que reciba el mail cae en la pantalla de "Not found" del `SITE_ACCESS_KEY` o es redirigido a `/login`.

**Verificación**: entrar a `/encuesta?email=alguien@ejemplo.com` en una ventana sin cookies (incógnito) y confirmar que carga sin pedir login ni el parámetro `ta=`.

### Tarea 4 — Página pública de la encuesta

- `src/app/encuesta/page.tsx` (server component): lee `?email=` de la URL, busca ese email en `usuarios_app` (con el cliente server de Supabase) para saludar por nombre si lo encuentra; si no viene `email` o no matchea ningún registro, igual renderiza el wizard pero arrancando por un paso extra que pide escribir el email a mano (mitigación del spec para cuando falla el link).
- `src/app/encuesta/encuesta-client.tsx` (client component): wizard de un paso a la vez con barra de progreso, estilo de marca (navy/cyan/lime, DM Sans, `Card`/`Button` de `src/components/ui/`). Pasos: 1) frecuencia de uso, 2) motivo de abandono (multi-select con "Otro" a texto libre), 3) percepción de precio (+ campo opcional "cuánto pagarías"), 4) precisión de la tasación, 5) comentario abierto (opcional), 6) WhatsApp (opcional) + botón final "Enviar". Al enviar, llama `supabase.rpc("guardar_respuesta_encuesta", {...})` con `createBrowserClient` (mismo patrón que `/baja`). Pantalla de agradecimiento final con el mensaje de la semana gratis. Sin guardado parcial (recargar reinicia el wizard), tal como define el spec.

**Verificación**: completar el flujo entero en el navegador desde `/encuesta?email=<un email real de usuarios_app>`, confirmar que la fila queda en `encuesta_respuestas` con el `usuario_id` correcto y que se puede volver atrás entre pasos sin perder lo ya tocado.

### Tarea 5 — Plantilla y función de envío en Brevo

- `src/lib/brevo/plantilla-encuesta.html` y `.txt`: mismo estilo que `plantilla-difusion.html`/`.txt` existentes, mensaje corto invitando a responder en 2 minutos a cambio de una semana gratis, botón/link a `{{ENCUESTA_URL}}`, y el link de baja (`{{UNSUB_URL}}`).
- `sendEncuestaEmail` en `src/lib/brevo/client.ts`: igual a `sendCampaignEmail` pero pensada para `usuarios_app` (nombre opcional en vez de `inmobiliaria` obligatorio).

**Verificación**: enviar un correo de prueba a una casilla propia y confirmar que el link de la encuesta trae el email correcto en la URL y que el diseño se ve bien en un cliente de mail real (no solo en el navegador).

### Tarea 6 — API de envío en lote

`src/app/api/usuarios/encuesta/enviar/route.ts` (POST, recibe `{ ids: string[] }` de `usuarios_app`): busca esos usuarios, arma la URL personalizada (`${NEXT_PUBLIC_SITE_URL}/encuesta?email=...`), manda con `sendEncuestaEmail` uno por uno (mismo loop con manejo de errores que `campanas/[id]/enviar/route.ts`), y marca `encuesta_enviada_at = now()` en cada envío exitoso. Devuelve `{ok: string[], fallidos: {email, error}[]}`.

**Verificación**: invocar con 2-3 ids de prueba reales (cuentas propias) y confirmar que llegan los mails y que `encuesta_enviada_at` se actualiza solo en los que salieron bien.

### Tarea 7 — Selección y envío desde la pantalla Usuarios

En `src/app/(app)/usuarios/usuarios-client.tsx` y `page.tsx` (agregando `encuesta_enviada_at`/`encuesta_respondida_at` al `select`): agregar checkboxes de selección múltiple (mismo patrón que la barra de acciones en lote de `pagos-client.tsx`), una barra de acción "Enviar encuesta a los N seleccionados" que llama a la API de la Tarea 6, y dos badges por fila ("Encuesta enviada" / "Respondió") para que sea visual quién ya fue contactado. Esto es lo que permite mandar primero la tanda de prueba (seleccionando a mano 30-50 filas) y después el resto.

**Verificación**: seleccionar 2-3 usuarios en la UI, mandar, y confirmar que el badge cambia a "Enviada" sin recargar la página.

### Tarea 8 — Vista de respuestas

`src/app/(app)/usuarios/respuestas/page.tsx` + `respuestas-client.tsx`: tabla con cada respuesta (nombre/email, las 6 respuestas, WhatsApp si lo dejó, fecha), pensada para que Leandro la recorra y vaya activando la semana gratis a mano en el sistema real de TasaProp. Acceso desde un link/botón en la cabecera de Usuarios ("Ver respuestas de la encuesta (N)") y como sub-ítem nuevo bajo "Usuarios" en el sidebar (`src/components/sidebar.tsx`), mismo patrón que "Seguimiento"/"Pruebas y Alianzas" bajo "Contactos".

**Verificación**: con al menos una respuesta de prueba cargada (Tarea 4), confirmar que aparece en esta vista con todos los campos legibles.

## Orden y dependencias

1 → 2 → 3 → 4 (necesita 1, 2 y 3 para funcionar de punta a punta) → 5 → 6 (necesita 5) → 7 (necesita 6) → 8 (puede ir en paralelo con 7, ambas necesitan solo la Tarea 1).

Cada tarea se verifica y se despliega/prueba en producción antes de pasar a la siguiente, siguiendo el flujo ya establecido en este proyecto (tsc/eslint/build → `vercel deploy --prod` → verificación en vivo).
