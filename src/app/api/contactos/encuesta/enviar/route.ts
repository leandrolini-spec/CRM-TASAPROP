import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { sendEncuestaEmail, upsertContact } from "@/lib/brevo/client";

const ASUNTO = "¿Nos contás qué te pareció TasaProp?";

export async function POST(req: NextRequest) {
  const { ids } = (await req.json()) as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Sin contactos seleccionados" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: contactos, error: contactosError } = await supabase
    .from("contactos")
    .select("id, inmobiliaria, email, baja")
    .in("id", ids);

  if (contactosError) {
    return NextResponse.json({ error: contactosError.message }, { status: 500 });
  }
  const destinatarios = (contactos ?? []).filter((c) => !c.baja && c.email);
  if (destinatarios.length === 0) {
    return NextResponse.json(
      { error: "Ninguno de los seleccionados puede recibir el mail (sin email o de baja)" },
      { status: 400 }
    );
  }

  const htmlTemplate = await readFile(
    path.join(process.cwd(), "src/lib/brevo/plantilla-encuesta.html"),
    "utf-8"
  );
  const textTemplate = await readFile(
    path.join(process.cwd(), "src/lib/brevo/plantilla-encuesta.txt"),
    "utf-8"
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200";

  const enviadosOk: string[] = [];
  const fallidos: { email: string; error: string }[] = [];

  for (const contacto of destinatarios) {
    const email = contacto.email as string;
    try {
      await upsertContact({ email, inmobiliaria: contacto.inmobiliaria });

      const unsubscribeUrl = `${siteUrl}/baja?email=${encodeURIComponent(email)}`;
      const encuestaUrl = `${siteUrl}/encuesta?email=${encodeURIComponent(email)}`;
      const primerNombre = contacto.inmobiliaria ? contacto.inmobiliaria.split(" ")[0] : null;
      const saludo = primerNombre ? `, ${primerNombre}` : "";

      await sendEncuestaEmail({
        to: email,
        nombre: contacto.inmobiliaria,
        subject: ASUNTO,
        html: htmlTemplate
          .replaceAll("{{NOMBRE_SALUDO}}", saludo)
          .replaceAll("{{ENCUESTA_URL}}", encuestaUrl)
          .replaceAll("{{UNSUB_URL}}", unsubscribeUrl),
        text: textTemplate
          .replaceAll("{NOMBRE_SALUDO}", saludo)
          .replaceAll("{ENCUESTA_URL}", encuestaUrl)
          .replaceAll("{UNSUB_URL}", unsubscribeUrl),
        unsubscribeUrl,
      });

      await supabase
        .from("contactos")
        .update({ encuesta_enviada_at: new Date().toISOString() })
        .eq("id", contacto.id);

      enviadosOk.push(email);
    } catch (err) {
      fallidos.push({
        email,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return NextResponse.json({ enviados: enviadosOk.length, fallidos });
}
