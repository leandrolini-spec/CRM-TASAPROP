import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addContactsToList } from "@/lib/brevo/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const contactIds: string[] = Array.isArray(body?.contactIds) ? body.contactIds : [];
  const listId: number = Number(body?.listId);

  if (contactIds.length === 0 || !listId) {
    return NextResponse.json({ error: "Faltan contactos o la lista" }, { status: 400 });
  }

  const { data: contactos, error } = await supabase
    .from("contactos")
    .select("id, email")
    .in("id", contactIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const emails = (contactos ?? [])
    .map((c) => c.email)
    .filter((e): e is string => !!e);
  const sinEmail = (contactos?.length ?? 0) - emails.length;

  if (emails.length === 0) {
    return NextResponse.json(
      { error: "Ninguno de los contactos seleccionados tiene email" },
      { status: 400 }
    );
  }

  try {
    await addContactsToList(listId, emails);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json({ agregados: emails.length, sinEmail });
}
