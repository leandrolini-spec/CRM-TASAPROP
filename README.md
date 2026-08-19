# CRM Tasaprop

Sistema interno de gestión para el equipo de Tasaprop. Reemplaza al
`Tracker_Inmobiliarias_Tasaprop.xlsx`: Contactos, Clientes, Pagos y
Campañas de email, con login por usuario/contraseña para todo el equipo.

- **Frontend/backend:** Next.js 16 (App Router)
- **Base de datos + auth:** Supabase (proyecto `tasaprop-crm`, ya creado y con el
  schema aplicado — región São Paulo)
- **Hosting recomendado:** Vercel, con dominio propio (ej. `crm.tasaprop.com`)

## Qué ya está hecho

- Proyecto Supabase creado (`tasaprop-crm`, plan free, $0/mes).
- Schema aplicado: tablas `profiles`, `contactos`, `clientes`, `pagos`,
  `campanas_email`, vista `recurrentes`. Row Level Security activado en
  todo — solo usuarios con una fila en `profiles` pueden leer/escribir.
- App Next.js funcionando: login, panel con embudo, y CRUD de las 4
  secciones. `npm run build` y `npx eslint src` pasan sin errores.
- **Lo que NO se pudo probar desde esta sesión:** el login real contra
  Supabase, porque este sandbox de Cowork tiene la salida de red
  restringida (no puede llegar a `*.supabase.co` directamente). El
  código sigue el patrón oficial de Supabase + Next.js App Router, y el
  build es válido — pero la primera prueba real de "iniciar sesión y ver
  datos" hay que hacerla ya en Vercel (con internet real) o corriendo
  esto en tu compu / en Claude Code.

## Paso 1 — Subir el código a un repo

```bash
cd tasaprop-crm
git init   # si no viene ya inicializado
git add .
git commit -m "CRM Tasaprop — versión inicial"
```

Subilo a GitHub (o el proveedor que uses) y conectá ese repo a Vercel.

## Paso 2 — Deploy en Vercel

1. Entrá a [vercel.com](https://vercel.com), "Add New Project", importá el repo.
2. En "Environment Variables" cargá:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://dejkzjfqfgpplrmcauxn.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (está en `.env.local`, es pública —
     el que protege los datos es Row Level Security, no esta key)
3. Deploy. Con eso ya vas a tener una URL tipo `tasaprop-crm.vercel.app`
   funcionando.

## Paso 3 — Dominio propio (crm.tasaprop.com)

1. En Vercel: Project → Settings → Domains → agregar `crm.tasaprop.com`.
2. En el DNS de `tasaprop.com` (donde sea que esté registrado el dominio),
   agregar el registro CNAME que Vercel te indique.
3. Vercel emite el certificado HTTPS solo, automático.

## Paso 4 — Crear el primer usuario admin (vos)

Esto lo hacés vos, no yo — necesita tu cuenta de Supabase:

1. En el [dashboard de Supabase](https://supabase.com/dashboard/project/dejkzjfqfgpplrmcauxn) →
   Authentication → Users → "Add user" → tu email + una contraseña que
   elijas vos.
2. Copiá el `User UID` que te muestra.
3. Andá a SQL Editor y corré (reemplazando los valores):

```sql
insert into public.profiles (id, nombre, email, rol)
values ('EL-UUID-QUE-COPIASTE', 'Leandro Lini', 'tu-email@tasaprop.com', 'admin');
```

4. Entrá a `crm.tasaprop.com` (o la URL de Vercel) con ese email/contraseña.

## Paso 5 — Agregar al resto del equipo

Mismo proceso del Paso 4 para cada persona: Supabase → Authentication →
Add user, después el `insert` en `profiles` con `rol = 'equipo'` (o
`'admin'` si corresponde). No hay un formulario de alta todavía dentro
de la app — se hace desde Supabase directamente. Si el equipo crece,
esto se puede automatizar con una pantalla de "invitar usuario" más
adelante.

## Estructura del proyecto

```
src/
  app/
    login/            → pantalla de login
    (app)/             → todo lo que requiere estar logueado
      layout.tsx        → chequea sesión, carga el perfil, nav
      page.tsx           → Panel (embudo + resumen)
      contactos/          → Contactos (reemplaza solapa Contactos)
      clientes/            → Clientes (pruebas gratis + beneficios)
      pagos/                → Pagos
      campanas/              → Programación de campañas de email
  lib/supabase/        → clientes de Supabase (browser/server/proxy)
  proxy.ts              → protege rutas: sin sesión → /login
```

## Próximos pasos posibles (no incluidos todavía)

- Integración real con Brevo (sync de contactos, disparo de campañas
  desde acá) y con n8n (automatizaciones tipo "clic en WhatsApp → marcar
  interesado").
- Pantalla de alta de usuarios dentro de la app (hoy se hace a mano en
  Supabase).
- Roles más finos por sección (hoy es admin/equipo, todo o nada).
- Vista "Equipo" y "Recurrentes" con más detalle (la vista `recurrentes`
  ya existe en la base, falta la pantalla).
