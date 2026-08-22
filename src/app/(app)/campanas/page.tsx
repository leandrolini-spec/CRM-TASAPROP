import { getCampaigns } from "@/lib/brevo/client";
import CampanasClient, { type CampanaBrevo } from "./campanas-client";

export default async function CampanasPage() {
  let campanas: CampanaBrevo[] = [];
  let error: string | null = null;
  try {
    const data = await getCampaigns();
    campanas = data.campaigns ?? [];
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return <CampanasClient initial={campanas} initialError={error} />;
}
