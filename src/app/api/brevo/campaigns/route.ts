import { NextResponse } from "next/server";
import { getCampaigns } from "@/lib/brevo/client";

export async function GET() {
  try {
    const data = await getCampaigns();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
