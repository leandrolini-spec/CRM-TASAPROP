import { createClient } from "@/lib/supabase/server";
import DesarrolloClient from "./desarrollo-client";

export default async function DesarrolloPage() {
  const supabase = await createClient();
  const { data: informes } = await supabase
    .from("desarrollo_informes")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  return <DesarrolloClient initial={informes ?? []} />;
}
