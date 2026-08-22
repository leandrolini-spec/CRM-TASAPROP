import { createClient } from "@/lib/supabase/server";
import ClientesClient from "./clientes-client";

export default async function ClientesPage() {
  const supabase = await createClient();

  // Pruebas vencidas que nadie pasó a Alianza salen solas de la lista activa.
  const hoy = new Date().toISOString().slice(0, 10);
  await supabase
    .from("clientes")
    .update({ estado: "Descartado" })
    .eq("estado", "Prueba")
    .lt("fecha_vencimiento", hoy);

  const { data } = await supabase
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  return <ClientesClient initial={data ?? []} />;
}
