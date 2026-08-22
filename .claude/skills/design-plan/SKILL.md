---
name: design-plan
description: "Se usa después de que el usuario aprueba el spec en design-spec — genera el plan de implementación en docs/plans/YYYY-MM-DD-titulo.md (objetivo, contexto del problema, spec de referencia, y la lista de tareas con detalles). Se detiene y espera aprobación antes de empezar a implementar."
metadata:
  version: 1.0.0
---

# Design plan — plan de implementación a partir de un spec aprobado

Se usa **después** de que el usuario aprueba un spec en `design-spec` (vía el approval gate de ese skill). Convierte ese spec, ya de producto/usuario, en un plan de implementación concreto y técnico.

## Punto de partida

- Necesitás el spec aprobado como insumo. Si `design-spec` te lo pasó directamente, usá ese path. Si te invocan standalone y no está claro a qué spec te referís, mirá `docs/specs/` y preguntá cuál corresponde si hay más de uno reciente o no es obvio — no adivines.
- Leé el spec completo antes de escribir nada del plan; el objetivo, el contexto y el alcance v1 del plan derivan directamente de ahí, no se re-negocian acá. Si al planificar encontrás algo que el spec no cubre o contradice, señalalo y preguntá — no lo resuelvas en silencio inventando alcance nuevo.
- A diferencia de `design-spec` (que es un documento de producto), el plan **sí** es técnico: mencioná archivos, componentes, rutas de API, tablas/RLS de Supabase, y decisiones de arquitectura concretas del proyecto (`tasaprop-crm`, Next.js App Router + Supabase).

## El documento

Escribí el archivo en:

```
docs/plans/YYYY-MM-DD-titulo.md
```

- `YYYY-MM-DD` es la fecha de hoy.
- `titulo` es el mismo slug del spec correspondiente (mismo nombre de archivo, distinta carpeta), para que sea trivial encontrar el par spec/plan.
- Creá el directorio `docs/plans/` si todavía no existe.

### Las 4 secciones (fijas, en este orden)

1. **Objetivo** — qué se va a construir, en 1-2 líneas, en términos técnicos (no repitas el overview de producto del spec, traducilo a qué hay que lograr).
2. **Contexto del problema** — resumen breve del contexto (tomado del spec), suficiente para que alguien que no leyó el spec entienda por qué existe este plan.
3. **El spec de referencia** — link/path al archivo en `docs/specs/` del que sale este plan. Si el plan se aparta del spec en algo puntual (una restricción técnica descubierta al planificar, por ejemplo), anotalo acá explícitamente.
4. **Lista de tareas a implementar, con detalles** — desglose concreto y ordenado (respetando dependencias) de las tareas. Cada tarea incluye:
   - Qué hay que hacer, específicamente
   - Qué archivos/componentes/rutas/tablas toca (los reales del proyecto, no genéricos)
   - Cómo se verifica que esa tarea quedó bien (qué comportamiento observar, no solo "typecheck pasa")

## Al terminar

Mostrá el path del archivo creado y la lista de tareas. **Detenete ahí** — no empieces a implementar ninguna tarea todavía. Esperá a que el usuario apruebe el plan (o pida ajustes) antes de arrancar.

Una vez que el usuario dé luz verde para implementar, creá las tareas del plan con `TaskCreate` (una por cada ítem de la sección 4) para trackear el progreso real durante la implementación, y marcalas con `TaskUpdate` a medida que avanzás — no reescribas el archivo del plan por cada avance, el archivo es el diseño; las `Task` son el tracking en vivo.
