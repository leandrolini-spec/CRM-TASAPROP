import { createBrowserClient } from "@supabase/ssr";
import EncuestaClient from "./encuesta-client";

export default async function EncuestaPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  let nombre: string | null = null;
  let emailValido: string | null = null;

  if (email) {
    // Cliente sin sesión (esta página es pública) — alcanza con la key
    // pública, la RLS de usuarios_app permite lectura solo al equipo, así
    // que hacemos una búsqueda puntual vía la misma función de guardado no
    // hace falta: solo necesitamos el nombre para saludar, si no lo
    // encontramos la encuesta igual funciona pidiendo el email a mano.
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.rpc("buscar_nombre_encuestado", {
      p_email: email,
    });
    const fila = (data as { nombre: string | null }[] | null)?.[0];
    if (fila) {
      nombre = fila.nombre;
      emailValido = email;
    }
  }

  return <EncuestaClient emailInicial={emailValido} nombreInicial={nombre} />;
}
