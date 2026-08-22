import { NextRequest, NextResponse } from "next/server";
import { upsertContact } from "@/lib/brevo/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, inmobiliaria, barrio, telefono } = body ?? {};

  if (!email) {
    return NextResponse.json({ skipped: true, reason: "sin email" });
  }

  try {
    await upsertContact({ email, inmobiliaria, barrio, telefono });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Best-effort: si Brevo falla no bloqueamos la carga del contacto en el CRM.
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 }
    );
  }
}
