"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Campana = {
  id: string;
  nombre: string;
  lista: string | null;
  fecha: string;
  programados: number;
  enviados: number;
  estado: string;
};

export default function CampanasClient({ initial }: { initial: Campana[] }) {
  const supabase = createClient();
  const [campanas, setCampanas] = useState<Campana[]>(initial);
  const [nuevo, setNuevo] = useState(() => ({
    nombre: "",
    lista: "",
    fecha: new Date().toISOString().slice(0, 10),
    programados: "",
  }));
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("campanas_email")
      .select("*")
      .order("fecha", { ascending: false });
    setCampanas((data as Campana[]) ?? []);
  }, [supabase]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.nombre.trim()) return;
    setGuardando(true);
    await supabase.from("campanas_email").insert({
      nombre: nuevo.nombre,
      lista: nuevo.lista || null,
      fecha: nuevo.fecha,
      programados: Number(nuevo.programados) || 0,
      estado: `SE ENVIARÁN ${Number(nuevo.programados) || 0} CORREOS`,
    });
    setNuevo({
      nombre: "",
      lista: "",
      fecha: new Date().toISOString().slice(0, 10),
      programados: "",
    });
    setGuardando(false);
    cargar();
  }

  async function marcarEnviados(id: string, programados: number, enviadosStr: string) {
    const enviados = Number(enviadosStr) || 0;
    const estado = `✓ ENVIADO ${enviados} CORREOS`;
    setCampanas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enviados, estado } : c))
    );
    await supabase
      .from("campanas_email")
      .update({ enviados, estado })
      .eq("id", id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#17184B]">
          Campañas de email
        </h1>
        <p className="text-sm text-[#72767B]">
          Programación semanal — solapa &ldquo;Tablero&rdquo; del Excel.
          Cargá acá cuánto salió de cada tanda en Brevo.
        </p>
      </div>

      <form
        onSubmit={agregar}
        className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
          placeholder="Nombre de campaña *"
          value={nuevo.nombre}
          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Lista (ej. Villa Urquiza)"
          value={nuevo.lista}
          onChange={(e) => setNuevo({ ...nuevo, lista: e.target.value })}
        />
        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={nuevo.fecha}
          onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })}
        />
        <input
          type="number"
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Programados"
          value={nuevo.programados}
          onChange={(e) => setNuevo({ ...nuevo, programados: e.target.value })}
        />
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-[#17184B] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 md:col-span-5"
        >
          {guardando ? "Agregando..." : "+ Programar campaña"}
        </button>
      </form>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#72767B] border-b">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Campaña</th>
              <th className="px-3 py-2">Lista</th>
              <th className="px-3 py-2">Programados</th>
              <th className="px-3 py-2">Enviados</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {campanas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[#72767B]">
                  Sin campañas cargadas todavía.
                </td>
              </tr>
            )}
            {campanas.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-3 py-2">{c.fecha}</td>
                <td className="px-3 py-2 font-medium">{c.nombre}</td>
                <td className="px-3 py-2 text-[#72767B]">{c.lista ?? "-"}</td>
                <td className="px-3 py-2">{c.programados}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    defaultValue={c.enviados}
                    onBlur={(e) =>
                      marcarEnviados(c.id, c.programados, e.target.value)
                    }
                    className="w-20 border rounded-md px-2 py-1 bg-yellow-50"
                  />
                </td>
                <td className="px-3 py-2 text-xs font-medium">{c.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
