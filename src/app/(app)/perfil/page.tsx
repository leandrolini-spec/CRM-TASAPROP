import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PerfilClient from "./perfil-client";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nombre, email, rol, telefono, email_trabajo, firma, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/");
  }

  return <PerfilClient profile={profile} />;
}
