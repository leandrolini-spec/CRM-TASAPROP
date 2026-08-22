import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTemplate } from "@/lib/brevo/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const contactIds: string[] = Array.isArray(body?.contactIds) ? body.contactIds : [];
  const templateId: number = Number(body?.templateId);

  if (contactIds.length === 0 || !templateId) {
    return NextResponse.json(
      { error: "Faltan contactos o la plantilla" },
      { status: 400 }
    );
  }

  const { data: contactos, error } = await supabase
    .from("contactos")
    .select("id, inmobiliaria, email")
    .in("id", contactIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const conEmail = (contactos ?? []).filter((c) => c.email);
  const sinEmail = (contactos?.length ?? 0) - conEmail.length;

  const resultados = await Promise.allSettled(
    conEmail.map((c) =>
      sendTemplate({ templateId, to: c.email as string, name: c.inmobiliaria })
    )
  );

  const enviados = resultados.filter((r) => r.status === "fulfilled").length;
  const fallidos = resultados.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ enviados, fallidos, sinEmail });
}
