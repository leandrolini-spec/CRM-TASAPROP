import { NextRequest, NextResponse } from "next/server";
import { createBrowserClient } from "@supabase/ssr";

// Ruta pública (sin login) para que cualquier destinatario se dé de baja con
// un clic, incluido el mecanismo "List-Unsubscribe-Post" que usan Gmail/Yahoo.
async function darDeBaja(email: string | null) {
  if (!email) return;
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  // El mismo link de baja se usa para destinatarios de contactos (agencias)
  // y de usuarios_app (usuarios de la app) — no sabemos de cuál viene, así
  // que se intenta en las dos; la que no tenga ese email no hace nada.
  await Promise.all([
    supabase.rpc("baja_contacto", { p_email: email }),
    supabase.rpc("baja_usuario_app", { p_email: email }),
  ]);
}

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Baja confirmada — Tasaprop</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#17184B;padding:0 20px;">
  <h1 style="font-size:22px;">Listo, te dimos de baja</h1>
  <p style="color:#72767B;font-size:15px;line-height:1.6;">No vas a recibir más correos de Tasaprop en esta dirección.</p>
</body>
</html>`;

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  await darDeBaja(email);
  return new NextResponse(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  // Gmail/Yahoo "unsubscribe de un clic" (RFC 8058) llaman por POST, sin UI.
  const email = req.nextUrl.searchParams.get("email");
  await darDeBaja(email);
  return new NextResponse(null, { status: 200 });
}
