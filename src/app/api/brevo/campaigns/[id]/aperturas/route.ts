import { NextRequest, NextResponse } from "next/server";
import {
  getCampaignDetail,
  getListContacts,
  getContactWithStats,
} from "@/lib/brevo/client";

type BrevoContact = {
  email: string;
  attributes?: { INMOBILIARIA?: string };
};

type BrevoContactWithStats = BrevoContact & {
  statistics?: {
    messagesSent?: { campaignId: number; eventTime: string }[];
    delivered?: { campaignId: number; eventTime: string }[];
    opened?: { campaignId: number; eventTime: string; count: number }[];
  };
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaignId = Number(id);

  try {
    const campaign = await getCampaignDetail(campaignId);
    const listIds: number[] = campaign.recipients?.lists ?? [];

    if (listIds.length === 0) {
      return NextResponse.json({ recipients: [] });
    }

    const listsContacts = await Promise.all(
      listIds.map((listId) => getListContacts(listId))
    );
    const emails = [
      ...new Set(
        listsContacts.flatMap(
          (r: { contacts?: BrevoContact[] }) =>
            r.contacts?.map((c) => c.email) ?? []
        )
      ),
    ];

    const detalles = await Promise.all(
      emails.map((email) =>
        getContactWithStats(email).catch(() => null)
      )
    );

    const recipients = detalles
      .filter((c): c is BrevoContactWithStats => c !== null)
      .map((c) => {
        const abierto = c.statistics?.opened?.find(
          (o) => o.campaignId === campaignId
        );
        const entregado = c.statistics?.delivered?.find(
          (d) => d.campaignId === campaignId
        );
        const enviado = c.statistics?.messagesSent?.find(
          (m) => m.campaignId === campaignId
        );
        return {
          email: c.email,
          inmobiliaria: c.attributes?.INMOBILIARIA ?? null,
          enviado: Boolean(enviado),
          entregado: Boolean(entregado),
          abierto: Boolean(abierto),
          fechaApertura: abierto?.eventTime ?? null,
          vecesAbierto: abierto?.count ?? 0,
        };
      })
      .sort((a, b) => Number(b.abierto) - Number(a.abierto));

    return NextResponse.json({ recipients });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
