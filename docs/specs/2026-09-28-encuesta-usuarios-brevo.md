# Encuesta de retención a usuarios de TasaProp

## 1. Overview

TasaProp tiene un problema de retención: mucha gente se descarga la app, la prueba una vez y no vuelve. Hoy no sabemos por qué — puede ser precio, dificultad de uso, funcionalidad, que no entienden el producto, o que la tasación no coincide con lo que esperaban del mercado. Esta encuesta le pregunta directamente a los 556 usuarios registrados cuál de esas cosas (o cuáles) les pasó, para poder priorizar qué arreglar primero. Se envía por Brevo, se completa en menos de 2 minutos desde el celular, y ofrece una semana de prueba gratis a cambio de responder.

## 2. Usuarios objetivo

Dos perfiles distintos:

- **Quien responde la encuesta**: cualquiera de los 556 usuarios registrados en la app TasaProp (agentes y agencias inmobiliarias), sin necesidad de iniciar sesión en nada — entra desde un link que le llega por mail.
- **Quien usa los resultados**: Leandro (admin del CRM), que revisa las respuestas para entender el problema de retención y, para cada uno que respondió, activa manualmente la semana de prueba gratis desde el sistema real de TasaProp (fuera de este CRM).

## 3. Contexto del problema

Ya existe en el CRM una sección "Usuarios" con los 556 registros (nombre + email) volcados desde el panel de administración de TasaProp. El objetivo original de esa sección era justo este: tener la agenda lista para una encuesta. Hoy no hay ningún canal para escuchar a estos usuarios — el problema de retención es una sospecha basada en el uso general, no en datos directos de por qué la gente se va. No hay antecedentes de ninguna encuesta previa en este proyecto.

## 4. Alcance v1

**Incluye:**
- Página pública nueva (sin login) con la encuesta, en varios pasos (una pregunta por pantalla, con barra de progreso), con la identidad visual de Tasaprop.
- El link que manda Brevo lleva el email de la persona incluido automáticamente (vía merge tag de Brevo), así nadie tiene que escribirlo — la encuesta ya sabe quién es.
- 6 preguntas: frecuencia de uso, motivo principal de abandono (opción múltiple con las hipótesis de precio/dificultad/tasación/funcionalidad), percepción de precio, precisión de la tasación vs. lo esperado, y una pregunta abierta opcional al final.
- Un paso final opcional para dejar el WhatsApp ("para avisarte más rápido cuando esté activa tu semana gratis").
- Pantalla de agradecimiento al terminar, mencionando que en breve lo van a contactar para activar la semana gratis.
- Las respuestas quedan guardadas y visibles desde el CRM (pestaña nueva dentro de Usuarios), cruzadas con el registro de cada usuario, para que Leandro vea quién respondió qué y su WhatsApp si lo dejó.
- Envío por Brevo primero a una tanda chica de prueba (30-50 usuarios reales, excluyendo cuentas internas/de prueba como Leandro, TasaProp, Test, etc.), y recién después al resto de la base.

**No incluye (por ahora):**
- Activación automática de la semana gratis — eso lo sigue haciendo Leandro a mano en el sistema real de TasaProp, esta encuesta no se conecta con ese sistema.
- Envío de recordatorios automáticos a quien no respondió.
- Análisis o gráficos automáticos de las respuestas (por ahora es una tabla para revisar a mano).
- Traducción de las preguntas — solo en español.
- Cualquier lógica condicional compleja entre preguntas (ej. ramificar preguntas distintas según la primera respuesta) — el orden de las preguntas es fijo para todos.

## 5. Comportamiento esperado

**Flujo principal:**
1. La persona recibe un mail de Brevo con un link personalizado a la encuesta.
2. Abre el link desde el celular (o la compu) y ve la primera pregunta, con una barra de progreso arriba y el diseño de marca de Tasaprop.
3. Responde tocando una opción (no hace falta escribir, salvo en la pregunta abierta y el WhatsApp, que son opcionales) y avanza automáticamente o con un botón "Siguiente".
4. Puede volver atrás para corregir una respuesta anterior.
5. En la última pantalla, ve un agradecimiento y el mensaje de que la van a contactar para activarle la semana gratis.
6. Si cierra la página antes de terminar, lo que respondió hasta ahí no queda guardado (no hay guardado parcial en v1) — puede volver a entrar por el mismo link y empezar de nuevo.

**Del lado del CRM:**
1. Leandro entra a Usuarios → pestaña "Respuestas de la encuesta".
2. Ve una lista de quién respondió, cuándo, y puede abrir cada respuesta para ver el detalle completo (las 6 respuestas + WhatsApp si lo dejó).
3. Con esa info, va al sistema real de TasaProp y activa la semana gratis para esa persona.

**Envío por Brevo:**
1. Antes del envío masivo, Leandro revisa y aprueba la tanda de prueba (30-50 emails reales).
2. Una vez confirmado que el link y el mail funcionan bien, se manda al resto de la base (excluyendo cuentas internas).

## 6. Posibles errores y mitigaciones

- **La persona entra al link pero no completa la encuesta**: no se guarda nada parcial en v1 — puede volver a entrar por el mismo link y empezar de nuevo sin problema (no hay estado que se "trabe").
- **Alguien reenvía su propio link a otra persona, o lo abre dos veces**: puede volver a responder — v1 no bloquea respuestas duplicadas por email; si hace falta, se filtra a mano al revisar.
- **El link personalizado no trae el email (falla el merge tag de Brevo)**: la encuesta debería poder mostrar un mensaje pidiendo el email antes de arrancar, en vez de romperse — a definir en el plan técnico.
- **Alguien contesta la pregunta abierta con una queja fuerte o algo delicado**: queda igual guardado y visible en el CRM; no hay moderación automática, Leandro lo lee directamente.
- **Se manda por error a la tanda completa en vez de a la de prueba**: se mitiga con la aprobación explícita de la tanda chica antes de habilitar el envío al resto — es un paso manual, no automático.
- **Alguien de la tanda de prueba es una cuenta interna/de prueba (Leandro, TasaProp, Test, etc.)**: se arma la lista de envío excluyendo esas cuentas a propósito antes de mandar.
