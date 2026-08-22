import { createClient } from "@/lib/supabase/server";
import CalendarioClient from "./calendario-client";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const [{ data: eventos }, { data: contactos }, { data: clientes }] =
    await Promise.all([
      supabase
        .from("eventos")
        .select("*, contactos(inmobiliaria), clientes(nombre)")
        .order("fecha", { ascending: true }),
      supabase
        .from("contactos")
        .select("id, inmobiliaria")
        .eq("archivado", false)
        .order("inmobiliaria"),
      supabase
        .from("clientes")
        .select("id, nombre")
        .neq("estado", "Descartado")
        .order("nombre"),
    ]);

  return (
    <CalendarioClient
      initial={eventos ?? []}
      contactos={contactos ?? []}
      clientes={clientes ?? []}
    />
  );
}
