import type { SupabaseClient } from "@supabase/supabase-js";
import type { useRouter } from "next/navigation";

export async function cerrarSesion(
  supabase: SupabaseClient,
  router: ReturnType<typeof useRouter>
) {
  await supabase.auth.signOut();
  router.push("/login");
  router.refresh();
}
