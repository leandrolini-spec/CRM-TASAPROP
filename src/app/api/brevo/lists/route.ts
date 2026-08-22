import { NextResponse } from "next/server";
import { getLists } from "@/lib/brevo/client";

type BrevoList = {
  id: number;
  name: string;
  uniqueSubscribers: number;
};

export async function GET() {
  try {
    const data = (await getLists()) as { lists: BrevoList[] };
    const lists = (data.lists ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      totalSubscribers: l.uniqueSubscribers,
    }));
    return NextResponse.json({ lists });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
