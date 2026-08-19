import { createClient } from "@/lib/supabase/server";
import CampanasClient from "./campanas-client";

export default async function CampanasPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campanas_email")
    .select("*")
    .order("fecha", { ascending: false });

  return <CampanasClient initial={data ?? []} />;
}
