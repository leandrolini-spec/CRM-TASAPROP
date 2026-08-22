import { createClient } from "@/lib/supabase/server";
import SeguimientoClient from "./seguimiento-client";

export default async function SeguimientoPage() {
  const supabase = await createClient();
  const [{ data: contactos }, { data: etapas }, { data: vinculados }] = await Promise.all([
    supabase
      .from("contactos")
      .select("*")
      .eq("archivado", false)
      .eq("excluido_seguimiento", false)
      .order("created_at", { ascending: false }),
    supabase.from("etapas_seguimiento").select("*").order("orden", { ascending: true }),
    supabase.from("clientes").select("contacto_id").not("contacto_id", "is", null),
  ]);

  return (
    <SeguimientoClient
      initial={contactos ?? []}
      etapasIniciales={etapas ?? []}
      derivados={(vinculados ?? []).map((v) => v.contacto_id as string)}
    />
  );
}
