import { NextRequest, NextResponse } from "next/server";
import { createBrowserClient } from "@supabase/ssr";

// Webhook de eventos transaccionales de Brevo (Settings → Webhooks → Transactional).
// No hay sesión de usuario acá, así que se usa la key pública + una función
// SECURITY DEFINER (registrar_evento_brevo) que hace el bypass de RLS necesario
// solo para estos dos casos puntuales (rebote / baja).
export async function POST(req: NextRequest) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const payload = await req.json();
  const eventos = Array.isArray(payload) ? payload : [payload];

  for (const evento of eventos) {
    const email = evento.email as string | undefined;
    const tipo = evento.event as string | undefined;
    if (!email || !tipo) continue;
    await supabase.rpc("registrar_evento_brevo", {
      p_email: email,
      p_evento: tipo,
    });
  }

  return NextResponse.json({ ok: true });
}
