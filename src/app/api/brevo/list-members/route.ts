import { NextRequest, NextResponse } from "next/server";
import { getListContacts } from "@/lib/brevo/client";

type BrevoContact = { email: string };

export async function GET(req: NextRequest) {
  const listId = Number(req.nextUrl.searchParams.get("listId"));
  if (!listId) {
    return NextResponse.json({ error: "Falta listId" }, { status: 400 });
  }

  try {
    const data = (await getListContacts(listId)) as { contacts: BrevoContact[] };
    const emails = (data.contacts ?? []).map((c) => c.email.toLowerCase());
    return NextResponse.json({ emails });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
