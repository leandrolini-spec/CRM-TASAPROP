import { createClient } from "@/lib/supabase/server";
import ContactosClient from "./contactos-client";

export default async function ContactosPage() {
  const supabase = await createClient();
  const [{ data }, { data: vinculados }] = await Promise.all([
    supabase.from("contactos").select("*").order("created_at", { ascending: false }),
    supabase.from("clientes").select("contacto_id").not("contacto_id", "is", null),
  ]);

  return (
    <ContactosClient
      initial={data ?? []}
      derivados={(vinculados ?? []).map((v) => v.contacto_id as string)}
    />
  );
}
