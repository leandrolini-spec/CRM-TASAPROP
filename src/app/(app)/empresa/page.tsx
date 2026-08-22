import { createClient } from "@/lib/supabase/server";
import EmpresaClient from "./empresa-client";

export default async function EmpresaPage() {
  const supabase = await createClient();
  const [{ data: datos }, { data: facturas }] = await Promise.all([
    supabase.from("empresa_datos").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("empresa_facturas")
      .select("*")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  return (
    <EmpresaClient
      datosIniciales={
        datos ?? {
          id: 1,
          cuit: null,
          razon_social: null,
          condicion_iva: null,
          banco: null,
          cbu: null,
          alias_cbu: null,
          titular_cuenta: null,
        }
      }
      facturasIniciales={facturas ?? []}
    />
  );
}
