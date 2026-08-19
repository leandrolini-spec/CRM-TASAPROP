import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/nav-bar";

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
    .select("nombre, email, rol")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-[#17184B] mb-2">
            Cuenta creada, falta un paso
          </h1>
          <p className="text-sm text-[#72767B]">
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
    <div className="min-h-screen bg-gray-50">
      <NavBar
        nombre={profile?.nombre ?? user.email ?? "Usuario"}
        rol={profile?.rol ?? null}
      />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
