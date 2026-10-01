import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { sendEncuestaEmail } from "@/lib/brevo/client";

function formatFechaLarga(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return `${dia}/${mes}/${anio}`;
}

const ASUNTO = "¡Tu semana de prueba gratis ya está activa!";

const TABLAS = {
  usuario: { tabla: "usuarios_app", nombreCampo: "nombre" },
  contacto: { tabla: "contactos", nombreCampo: "inmobiliaria" },
} as const;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tipo = body?.tipo as "usuario" | "contacto";
  const id = body?.id as string;
  const dias = Number(body?.dias);

  if (!TABLAS[tipo] || !id || !Number.isFinite(dias) || dias <= 0) {
    return NextResponse.json({ error: "Faltan datos o son inválidos" }, { status: 400 });
  }

  const { tabla, nombreCampo } = TABLAS[tipo];
  const supabase = await createClient();

  const { data: registro, error: fetchError } = await supabase
    .from(tabla)
    .select(`id, email, ${nombreCampo}`)
    .eq("id", id)
    .single();

  if (fetchError || !registro) {
    return NextResponse.json({ error: fetchError?.message ?? "No encontrado" }, { status: 404 });
  }
  const email = (registro as Record<string, unknown>).email as string | null;
  if (!email) {
    return NextResponse.json({ error: "Este registro no tiene email" }, { status: 400 });
  }
  const nombre = (registro as Record<string, unknown>)[nombreCampo] as string | null;

  const activadaAt = new Date();
  const venceAt = new Date(activadaAt.getTime() + dias * 24 * 60 * 60 * 1000);

  const { error: updateError } = await supabase
    .from(tabla)
    .update({
      prueba_activada_at: activadaAt.toISOString(),
      prueba_vence_at: venceAt.toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  try {
    const [htmlTemplate, textTemplate] = await Promise.all([
      readFile(path.join(process.cwd(), "src/lib/brevo/plantilla-prueba-activada.html"), "utf-8"),
      readFile(path.join(process.cwd(), "src/lib/brevo/plantilla-prueba-activada.txt"), "utf-8"),
    ]);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200";
    const unsubscribeUrl = `${siteUrl}/baja?email=${encodeURIComponent(email)}`;
    const primerNombre = nombre ? nombre.split(" ")[0] : null;
    const saludo = primerNombre ? `, ${primerNombre}` : "";
    const fechaVencimiento = formatFechaLarga(venceAt.toISOString().slice(0, 10));

    await sendEncuestaEmail({
      to: email,
      nombre,
      subject: ASUNTO,
      html: htmlTemplate
        .replaceAll("{{NOMBRE_SALUDO}}", saludo)
        .replaceAll("{{FECHA_VENCIMIENTO}}", fechaVencimiento)
        .replaceAll("{{UNSUB_URL}}", unsubscribeUrl),
      text: textTemplate
        .replaceAll("{NOMBRE_SALUDO}", saludo)
        .replaceAll("{FECHA_VENCIMIENTO}", fechaVencimiento)
        .replaceAll("{UNSUB_URL}", unsubscribeUrl),
      unsubscribeUrl,
    });
  } catch (err) {
    console.error("No se pudo enviar el mail de prueba activada:", err);
    return NextResponse.json({
      ok: true,
      venceAt: venceAt.toISOString(),
      mailError: "Se activó la prueba pero no se pudo enviar el mail de aviso.",
    });
  }

  return NextResponse.json({ ok: true, venceAt: venceAt.toISOString() });
}
