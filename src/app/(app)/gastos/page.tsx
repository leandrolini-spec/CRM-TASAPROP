import { createClient } from "@/lib/supabase/server";
import GastosClient from "./gastos-client";

export default async function GastosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gastos")
    .select("*")
    .order("fecha", { ascending: false });

  return <GastosClient initial={data ?? []} />;
}
