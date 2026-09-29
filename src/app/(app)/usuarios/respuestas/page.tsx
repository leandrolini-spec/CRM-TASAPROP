import { createClient } from "@/lib/supabase/server";
import RespuestasClient from "./respuestas-client";

export default async function RespuestasEncuestaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("encuesta_respuestas")
    .select("*, usuarios_app(nombre)")
    .order("created_at", { ascending: false });

  return <RespuestasClient initial={data ?? []} />;
}
