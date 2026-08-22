import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { sendCampaignEmail } from "@/lib/brevo/client";

const ASUNTO =
  "Informes de mercado en minutos para tu inmobiliaria — probalo gratis (CABA)";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campana, error: campanaError } = await supabase
    .from("campanas_email")
    .select("*")
    .eq("id", id)
    .single();

  if (campanaError || !campana) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  const faltan = Math.max(0, campana.programados - campana.enviados);
  if (faltan === 0) {
    return NextResponse.json({ error: "Esta campaña ya está completa" }, { status: 400 });
  }

  const { data: contactos, error: contactosError } = await supabase
    .from("contactos")
    .select("id, inmobiliaria, email")
    .eq("estado", "Pendiente")
    .not("email", "is", null)
    .order("created_at", { ascending: true })
    .limit(faltan);

  if (contactosError) {
    return NextResponse.json({ error: contactosError.message }, { status: 500 });
  }
  if (!contactos || contactos.length === 0) {
    return NextResponse.json(
      { error: "No hay contactos Pendientes con email para enviar" },
      { status: 400 }
    );
  }

  const htmlTemplate = await readFile(
    path.join(process.cwd(), "src/lib/brevo/plantilla-difusion.html"),
    "utf-8"
  );
  const textTemplate = await readFile(
    path.join(process.cwd(), "src/lib/brevo/plantilla-difusion.txt"),
    "utf-8"
  );

  const enviadosOk: string[] = [];
  const fallidos: { email: string; error: string }[] = [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200";

  for (const contacto of contactos) {
    try {
      const unsubscribeUrl = `${siteUrl}/baja?email=${encodeURIComponent(contacto.email as string)}`;
      await sendCampaignEmail({
        to: contacto.email as string,
        inmobiliaria: contacto.inmobiliaria,
        subject: ASUNTO,
        html: htmlTemplate
          .replaceAll("{{INMOBILIARIA}}", contacto.inmobiliaria)
          .replaceAll("{{UNSUB_URL}}", unsubscribeUrl),
        text: textTemplate
          .replaceAll("{INMOBILIARIA}", contacto.inmobiliaria)
          .replaceAll("{UNSUB_URL}", unsubscribeUrl),
        unsubscribeUrl,
      });
      await supabase
        .from("contactos")
        .update({
          correo_enviado: true,
          estado: "Enviado",
          fecha_envio: new Date().toISOString().slice(0, 10),
        })
        .eq("id", contacto.id);
      enviadosOk.push(contacto.email as string);
    } catch (err) {
      fallidos.push({
        email: contacto.email as string,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const totalEnviados = campana.enviados + enviadosOk.length;
  const estado =
    totalEnviados >= campana.programados
      ? `✓ ENVIADO ${totalEnviados} CORREOS`
      : `✓ ENVIADO ${totalEnviados} DE ${campana.programados} CORREOS`;

  await supabase
    .from("campanas_email")
    .update({ enviados: totalEnviados, estado })
    .eq("id", id);

  return NextResponse.json({
    enviados: enviadosOk.length,
    fallidos,
    totalCampana: totalEnviados,
  });
}
