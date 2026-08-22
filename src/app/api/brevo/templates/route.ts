import { NextResponse } from "next/server";
import { getTemplates } from "@/lib/brevo/client";

type BrevoTemplate = {
  id: number;
  name: string;
  subject: string;
};

export async function GET() {
  try {
    const data = (await getTemplates()) as { templates: BrevoTemplate[] };
    const templates = (data.templates ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
    }));
    return NextResponse.json({ templates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
