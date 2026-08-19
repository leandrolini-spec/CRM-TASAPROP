"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Contacto = {
  id: string;
  inmobiliaria: string;
  barrio: string | null;
  telefono: string | null;
  email: string | null;
  instagram: string | null;
  web: string | null;
  fuente: string | null;
  fecha_envio: string | null;
  correo_enviado: boolean;
  respondio: boolean;
  interesado: boolean | null;
  reunion: boolean;
  baja: boolean;
  estado: string;
  notas: string | null;
};

const ESTADOS = [
  "Pendiente",
  "Enviado",
  "Respondió",
  "Interesado",
  "Reunión",
  "No interesado",
  "Baja",
];

const ESTADO_COLOR: Record<string, string> = {
  Pendiente: "bg-yellow-50",
  Enviado: "bg-green-50",
  Respondió: "bg-green-50",
  Interesado: "bg-green-50",
  Reunión: "bg-green-50",
  "No interesado": "bg-red-50",
  Baja: "bg-red-50",
};

export default function ContactosClient({ initial }: { initial: Contacto[] }) {
  const supabase = createClient();
  const [contactos, setContactos] = useState<Contacto[]>(initial);
  const [filtroBarrio, setFiltroBarrio] = useState("");
  const [nuevo, setNuevo] = useState({
    inmobiliaria: "",
    barrio: "",
    email: "",
    telefono: "",
    fuente: "",
  });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("contactos")
      .select("*")
      .order("created_at", { ascending: false });
    setContactos((data as Contacto[]) ?? []);
  }, [supabase]);

  async function agregarContacto(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.inmobiliaria.trim()) return;
    setGuardando(true);
    await supabase.from("contactos").insert({
      inmobiliaria: nuevo.inmobiliaria,
      barrio: nuevo.barrio || null,
      email: nuevo.email || null,
      telefono: nuevo.telefono || null,
      fuente: nuevo.fuente || null,
    });
    setNuevo({ inmobiliaria: "", barrio: "", email: "", telefono: "", fuente: "" });
    setGuardando(false);
    cargar();
  }

  async function actualizarEstado(id: string, estado: string) {
    setContactos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado } : c))
    );
    await supabase.from("contactos").update({ estado }).eq("id", id);
  }

  async function actualizarBooleano(
    id: string,
    campo: "correo_enviado" | "respondio" | "reunion" | "baja",
    valor: boolean
  ) {
    setContactos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c))
    );
    await supabase.from("contactos").update({ [campo]: valor }).eq("id", id);
  }

  const filtrados = filtroBarrio
    ? contactos.filter((c) =>
        c.barrio?.toLowerCase().includes(filtroBarrio.toLowerCase())
      )
    : contactos;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#17184B]">Contactos</h1>
        <p className="text-sm text-[#72767B]">
          Reemplaza la solapa &ldquo;Contactos&rdquo; del Excel. La fila se
          colorea sola según el Estado, igual que antes.
        </p>
      </div>

      <form
        onSubmit={agregarContacto}
        className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
          placeholder="Inmobiliaria *"
          value={nuevo.inmobiliaria}
          onChange={(e) => setNuevo({ ...nuevo, inmobiliaria: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Barrio"
          value={nuevo.barrio}
          onChange={(e) => setNuevo({ ...nuevo, barrio: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Email"
          value={nuevo.email}
          onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Teléfono/WhatsApp"
          value={nuevo.telefono}
          onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
        />
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-[#17184B] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? "Agregando..." : "+ Agregar"}
        </button>
      </form>

      <input
        className="border rounded-lg px-3 py-2 text-sm w-full max-w-xs"
        placeholder="Filtrar por barrio..."
        value={filtroBarrio}
        onChange={(e) => setFiltroBarrio(e.target.value)}
      />

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#72767B] border-b">
              <th className="px-3 py-2">Inmobiliaria</th>
              <th className="px-3 py-2">Barrio</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Enviado</th>
              <th className="px-3 py-2">Respondió</th>
              <th className="px-3 py-2">Reunión</th>
              <th className="px-3 py-2">Baja</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[#72767B]">
                  Sin contactos todavía.
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr
                key={c.id}
                className={`border-b last:border-0 ${ESTADO_COLOR[c.estado] ?? ""}`}
              >
                <td className="px-3 py-2 font-medium">{c.inmobiliaria}</td>
                <td className="px-3 py-2">{c.barrio ?? "-"}</td>
                <td className="px-3 py-2 text-[#72767B]">
                  {c.email ?? c.telefono ?? "-"}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={c.correo_enviado}
                    onChange={(e) =>
                      actualizarBooleano(c.id, "correo_enviado", e.target.checked)
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={c.respondio}
                    onChange={(e) =>
                      actualizarBooleano(c.id, "respondio", e.target.checked)
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={c.reunion}
                    onChange={(e) =>
                      actualizarBooleano(c.id, "reunion", e.target.checked)
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={c.baja}
                    onChange={(e) =>
                      actualizarBooleano(c.id, "baja", e.target.checked)
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={c.estado}
                    onChange={(e) => actualizarEstado(c.id, e.target.value)}
                    className="border rounded-md px-2 py-1 text-xs bg-white"
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
