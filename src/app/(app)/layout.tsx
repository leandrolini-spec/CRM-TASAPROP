import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/sidebar";
import { FirmaProvider } from "@/lib/firma-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-tint px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-brand-navy mb-2">
            Cuenta creada, falta un paso
          </h1>
          <p className="text-sm text-brand-gray">
            Tu usuario ({user.email}) existe pero todavía no tiene perfil
            asignado en el equipo. Pedile a un admin que ejecute en Supabase
            (SQL editor):
          </p>
          <pre className="mt-3 text-left text-xs bg-white border rounded-lg p-3 overflow-x-auto">
            {`insert into public.profiles (id, nombre, email, rol)\nvalues ('${user.id}', 'Tu Nombre', '${user.email}', 'equipo');`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <FirmaProvider firma={profile.firma}>
      <div className="min-h-screen bg-brand-tint md:flex">
        <Sidebar profile={profile} />
        <main className="flex-1 min-w-0 px-4 py-6 md:px-8 pt-16 md:pt-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </FirmaProvider>
  );
}
