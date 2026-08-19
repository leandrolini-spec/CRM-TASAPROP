import { createClient } from "@/lib/supabase/server";
import PagosClient from "./pagos-client";

export default async function PagosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pagos")
    .select("*")
    .order("fecha", { ascending: false });

  return <PagosClient initial={data ?? []} />;
}
