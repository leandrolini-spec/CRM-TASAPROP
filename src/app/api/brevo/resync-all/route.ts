import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertContact } from "@/lib/brevo/client";

export const maxDuration = 60;

const LOTE = 4;
const PAUSA_ENTRE_LOTES_MS = 250;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: contactos, error } = await supabase
    .from("contactos")
    .select("email, inmobiliaria, barrio, telefono")
    .not("email", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lista = contactos ?? [];
  let ok = 0;
  let fallidos = 0;
  const detalleFallos: { email: string; error: string }[] = [];

  for (let i = 0; i < lista.length; i += LOTE) {
    const lote = lista.slice(i, i + LOTE);
    const resultados = await Promise.allSettled(
      lote.map((c) =>
        upsertContact({
          email: c.email as string,
          inmobiliaria: c.inmobiliaria,
          barrio: c.barrio,
          telefono: c.telefono,
        })
      )
    );
    resultados.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        ok += 1;
      } else {
        fallidos += 1;
        detalleFallos.push({
          email: lote[idx].email as string,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    });
    if (i + LOTE < lista.length) {
      await new Promise((resolve) => setTimeout(resolve, PAUSA_ENTRE_LOTES_MS));
    }
  }

  return NextResponse.json({ total: lista.length, ok, fallidos, detalleFallos });
}
