import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { sendEncuestaEmail } from "@/lib/brevo/client";

const ASUNTO = "¡Gracias por tu respuesta!";

const MENSAJE_CON_WHATSAPP =
  "<strong style=\"color:#17184B; font-size:17px;\">En breve nos ponemos en contacto por WhatsApp para activarte tu semana de prueba gratis.</strong>";
const MENSAJE_SIN_WHATSAPP =
  "<strong style=\"color:#17184B; font-size:17px;\">Para activarte tu semana de prueba gratis, respondé este mail con tu WhatsApp y nos contactamos enseguida.</strong>";

const MENSAJE_CON_WHATSAPP_TEXTO =
  "En breve nos ponemos en contacto por WhatsApp para activarte tu semana de prueba gratis.";
const MENSAJE_SIN_WHATSAPP_TEXTO =
  "Para activarte tu semana de prueba gratis, respondé este mail con tu WhatsApp y nos contactamos enseguida.";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = (body?.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc("guardar_respuesta_encuesta", {
    p_email: email,
    p_frecuencia_uso: body.frecuencia_uso,
    p_motivo_abandono: body.motivo_abandono ?? [],
    p_motivo_otro: body.motivo_otro ?? null,
    p_percepcion_precio: body.percepcion_precio,
    p_precio_dispuesto: body.precio_dispuesto ?? null,
    p_tasacion_precision: body.tasacion_precision,
    p_whatsapp: body.whatsapp ?? null,
    p_comentario: body.comentario ?? null,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  // El agradecimiento es "mejor esfuerzo": si Brevo falla no queremos que
  // la persona vea un error después de haber completado la encuesta bien.
  try {
    const { data } = await supabase.rpc("buscar_nombre_encuestado", { p_email: email });
    const nombre = (data as { nombre: string | null }[] | null)?.[0]?.nombre ?? null;
    const primerNombre = nombre ? nombre.split(" ")[0] : null;
    const saludo = primerNombre ? `, ${primerNombre}` : "";

    const tieneWhatsapp = !!(body.whatsapp && String(body.whatsapp).trim());

    const [htmlTemplate, textTemplate] = await Promise.all([
      readFile(path.join(process.cwd(), "src/lib/brevo/plantilla-gracias-encuesta.html"), "utf-8"),
      readFile(path.join(process.cwd(), "src/lib/brevo/plantilla-gracias-encuesta.txt"), "utf-8"),
    ]);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200";
    const unsubscribeUrl = `${siteUrl}/baja?email=${encodeURIComponent(email)}`;

    await sendEncuestaEmail({
      to: email,
      nombre,
      subject: ASUNTO,
      html: htmlTemplate
        .replaceAll("{{NOMBRE_SALUDO}}", saludo)
        .replaceAll(
          "{{MENSAJE_SIGUIENTE_PASO}}",
          tieneWhatsapp ? MENSAJE_CON_WHATSAPP : MENSAJE_SIN_WHATSAPP
        )
        .replaceAll("{{UNSUB_URL}}", unsubscribeUrl),
      text: textTemplate
        .replaceAll("{NOMBRE_SALUDO}", saludo)
        .replaceAll(
          "{MENSAJE_SIGUIENTE_PASO}",
          tieneWhatsapp ? MENSAJE_CON_WHATSAPP_TEXTO : MENSAJE_SIN_WHATSAPP_TEXTO
        )
        .replaceAll("{UNSUB_URL}", unsubscribeUrl),
      unsubscribeUrl,
    });
  } catch (err) {
    // La respuesta ya se guardó — el agradecimiento es secundario, pero
    // logueamos para poder diagnosticar si Brevo empieza a fallar.
    console.error("No se pudo enviar el agradecimiento de la encuesta:", err);
    return NextResponse.json({
      ok: true,
      graciasError: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}
