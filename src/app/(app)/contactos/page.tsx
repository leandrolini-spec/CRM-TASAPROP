import { createClient } from "@/lib/supabase/server";
import ContactosClient from "./contactos-client";

export default async function ContactosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contactos")
    .select("*")
    .order("created_at", { ascending: false });

  return <ContactosClient initial={data ?? []} />;
}
