import { createClient } from "@/lib/supabase/server";
import UsuariosClient from "./usuarios-client";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("usuarios_app")
    .select("*")
    .order("nombre", { ascending: true });

  return <UsuariosClient initial={data ?? []} />;
}
