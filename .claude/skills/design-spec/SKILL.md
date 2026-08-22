---
name: design-spec
description: "Se usa cuando ya hay claridad sobre el problema y qué se quiere construir (después de brainstorming, o directamente si el usuario ya lo tiene claro) — antes de planificar o escribir código. Diseña un documento de especificación desde el punto de vista del usuario en docs/specs/YYYY-MM-DD-titulo.md, con 6 secciones fijas. Termina con un approval gate explícito: iterar el spec o aprobarlo y pasar a design-plan."
metadata:
  version: 1.0.0
---

# Design spec — especificación desde el punto de vista del usuario

Se usa cuando ya hay claridad sobre el problema y qué se quiere construir — típicamente después de elegir una alternativa en `brainstorming`, pero también funciona standalone cuando el usuario ya tiene el contexto claro sin haber pasado por ahí. Va **antes** de Plan Mode o de escribir código: el spec es la base sobre la que después se planifica.

## Punto de partida

- **Si venís de `brainstorming`**: usá la alternativa elegida (y lo que se resolvió en las preguntas de clarificación de ese paso) como base — no vuelvas a preguntar lo que ya quedó cerrado ahí.
- **Si no pasaste por `brainstorming`**: reuní vos el contexto que falte para completar las 6 secciones, preguntando directamente lo que sea genuinamente ambiguo (mismo criterio: opciones concretas vía `AskUserQuestion`, no preguntas abiertas tipo "contame más"). No inventes el contenido de una sección si no tenés con qué llenarla honestamente — preguntá primero en vez de rellenar con supuestos no confirmados.

## El documento

Escribí el archivo en:

```
docs/specs/YYYY-MM-DD-titulo.md
```

- `YYYY-MM-DD` es la fecha de hoy.
- `titulo` es un slug corto en kebab-case derivado del nombre de la feature/desarrollo (ej. `2026-03-14-export-por-lotes.md`).
- Creá el directorio `docs/specs/` si todavía no existe.

### Tono y enfoque: desde el punto de vista del usuario

Es un documento de producto, no un documento técnico — evitá detalles de implementación (qué archivos tocar, qué componente usar, arquitectura interna, nombres de funciones). Describí todo en términos de lo que el usuario (admin o equipo de Tasaprop) ve, hace y necesita. Si hay una decisión técnica importante que condiciona el producto (ej. "esto requiere un proveedor externo de IA" o "esto depende de una política de RLS en Supabase"), mencionala como restricción o riesgo, no como diseño de implementación.

### Las 6 secciones (fijas, en este orden)

1. **Overview** — qué es esto en 2-3 líneas: el problema que resuelve y la idea central de la solución.
2. **Usuarios objetivo** — quién lo va a usar (admin, equipo, o ambos) y en qué situación o momento de su flujo de trabajo.
3. **Contexto del problema** — por qué hace falta esto ahora, qué pasa hoy sin esta solución (el dolor concreto), y cualquier antecedente relevante.
4. **Alcance v1** — qué entra en esta primera versión y qué explícitamente no entra todavía. Una lista de "no incluye" es tan importante como la de "incluye".
5. **Comportamiento esperado** — cómo se comporta la funcionalidad desde la perspectiva del usuario: flujo principal paso a paso, y variantes o casos secundarios relevantes. Usá ejemplos concretos ("el usuario hace X, ve Y") en vez de descripciones abstractas.
6. **Posibles errores y mitigaciones** — qué puede salir mal desde el punto de vista del usuario (no solo errores técnicos: también confusión, expectativas no cumplidas, casos límite) y cómo se mitiga cada uno.

## Al terminar: approval gate

Mostrá el path del archivo creado y un resumen breve de las 6 secciones. No armes un plan de implementación, no entres en Plan Mode, no empieces a escribir código.

En cambio, preguntá explícitamente con `AskUserQuestion` qué hacer con el spec:

- **Iterar el spec** — el usuario pide cambios sobre alguna sección; aplicalos sobre el mismo archivo (no crees uno nuevo) y volvé a mostrar este mismo gate.
- **Aprobar y continuar con `design-plan`** — invocá el skill `design-plan` pasándole el path del spec recién aprobado como referencia.

No asumas la aprobación por silencio ni sigas de largo sin esta confirmación explícita — es un punto de control real, no un resumen de cortesía.
