import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEncuestaEmail } from "@/lib/brevo/client";

const DESTINATARIO = "leandrolini@gmail.com";

type Fila = { tabla: string; id: string; nombre: string | null; email: string };

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hoyArt = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pruebas_que_vencen", { p_fecha: hoyArt });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filas = (data ?? []) as Fila[];
  if (filas.length === 0) {
    return NextResponse.json({ ok: true, vencenHoy: 0 });
  }

  const items = filas
    .map(
      (f) =>
        `<li style="margin-bottom:6px;">${f.nombre ?? "(sin nombre)"} — ${f.email} <span style="color:#72767B;">(${f.tabla === "usuario" ? "Usuario App" : "Contacto"})</span></li>`
    )
    .join("");
  const itemsTexto = filas
    .map((f) => `- ${f.nombre ?? "(sin nombre)"} — ${f.email} (${f.tabla === "usuario" ? "Usuario App" : "Contacto"})`)
    .join("\n");

  const html = `
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#17184B;font-weight:700;">
      ${filas.length} prueba${filas.length === 1 ? "" : "s"} gratis vence${filas.length === 1 ? "" : "n"} hoy
    </p>
    <ul style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#202124;padding-left:20px;">
      ${items}
    </ul>
  `;
  const text = `${filas.length} prueba(s) gratis vence(n) hoy:\n\n${itemsTexto}`;

  await sendEncuestaEmail({
    to: DESTINATARIO,
    nombre: null,
    subject: `${filas.length} prueba${filas.length === 1 ? "" : "s"} gratis vence${filas.length === 1 ? "" : "n"} hoy`,
    html,
    text,
    unsubscribeUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://tasaprop-crm.vercel.app"}/baja?email=${encodeURIComponent(DESTINATARIO)}`,
  });

  return NextResponse.json({ ok: true, vencenHoy: filas.length });
}
