---
name: brainstorming
description: "Se usa SIEMPRE antes de arrancar cualquier desarrollo nuevo (una pantalla, un componente, una automatización, un endpoint, un cambio de flujo, etc.), sin importar el tamaño — antes de escribir código o entrar en Plan Mode. Pregunta para evitar ambigüedades y termina presentando 2-3 alternativas de enfoque. No planifica en detalle ni implementa nada; se detiene ahí hasta que el usuario elige."
metadata:
  version: 1.0.0
---

# Brainstorming — antes de arrancar un desarrollo nuevo

Primer paso obligatorio antes de tocar código en cualquier pedido de **algo nuevo** en el CRM Tasaprop — no importa el tamaño: una pantalla nueva, un componente, una integración (Brevo, Mercado Pago, etc.), un cambio de flujo de trabajo del equipo. Va **antes** de escribir código y **antes** de entrar en Plan Mode o armar un plan detallado.

## Cuándo NO usarlo

- Bugs o arreglos de algo que ya existe y se rompió
- Pedidos donde el usuario ya especificó exactamente qué hacer y cómo (no hay ambigüedad real que resolver)
- Continuar un trabajo ya en curso (ej. seguir con el siguiente paso de un plan ya aprobado)

## Paso 1 — Preguntas de clarificación

Antes de proponer nada, identificá qué es genuinamente ambiguo en el pedido y preguntá. No hay una lista fija que se repite siempre — priorizá lo que de verdad no sepas, típicamente entre estos ejes:

- **Alcance**: ¿qué entra y qué no entra en esta primera versión?
- **Prioridad**: si hay que elegir, ¿qué importa más — velocidad de entrega, calidad/pulido, flexibilidad a futuro?
- **Restricciones técnicas**: ¿hay algo del stack existente (Next.js App Router, Supabase/RLS, Brevo, el modelo de roles admin/equipo) que no se puede tocar o romper?
- **Referencias**: ¿hay un ejemplo, competidor o estilo a imitar o evitar? ¿Aplica el manual de marca de Tasaprop?
- **Usuarios/casos de uso**: ¿quién lo va a usar (admin vs. equipo) y en qué momento del flujo de trabajo?

Usá `AskUserQuestion` para esto, con opciones concretas (y una marcada como recomendada cuando tengas una opinión fundada) — no preguntas abiertas tipo "contame más". Como máximo un par de rondas de preguntas; si después de eso queda algo ambiguo pero no bloqueante, avanzá con el supuesto más razonable y dejalo explícito en la propuesta del Paso 2 en vez de seguir preguntando.

## Paso 2 — Presentar 2 o 3 alternativas

Con las respuestas, armá entre 2 y 3 enfoques concretos y distintos para arrancar el desarrollo. Cada alternativa lleva:

- Un nombre corto que la identifique
- Qué implica en términos concretos (mencioná archivos/componentes/tablas reales cuando se pueda, no en abstracto)
- El trade-off principal frente a las otras (más rápido pero menos flexible, más prolijo pero más trabajo, reutiliza algo existente vs. construye de cero, etc.)

Si una alternativa es claramente mejor, decilo — pero mostrá igual las otras para que quede claro qué se descarta y por qué.

## Paso 3 — Detenerse

Una vez mostradas las alternativas, el skill termina ahí. No arma un plan detallado, no entra en Plan Mode, no empieza a escribir código — ni siquiera para la alternativa que parezca mejor. Espera a que el usuario elija una (o pida ajustes) antes de seguir con cualquier otro paso.
