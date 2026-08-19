"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nombre: string;
  email: string | null;
  dominio: string | null;
  tipo: "individual" | "inmobiliaria";
  descuento_pct: number;
  fecha_inicio_prueba: string | null;
  fecha_vencimiento: string | null;
};

export default function ClientesClient({ initial }: { initial: Cliente[] }) {
  const supabase = createClient();
  const [clientes, setClientes] = useState<Cliente[]>(initial);
  const [now] = useState(() => Date.now());
  const [nuevo, setNuevo] = useState({
    nombre: "",
    email: "",
    dominio: "",
    tipo: "individual" as "individual" | "inmobiliaria",
    descuento_pct: "0",
    fecha_vencimiento: "",
  });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });
    setClientes((data as Cliente[]) ?? []);
  }, [supabase]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.nombre.trim()) return;
    setGuardando(true);
    await supabase.from("clientes").insert({
      nombre: nuevo.nombre,
      email: nuevo.email || null,
      dominio: nuevo.dominio || null,
      tipo: nuevo.tipo,
      descuento_pct: Number(nuevo.descuento_pct) || 0,
      fecha_inicio_prueba: new Date().toISOString().slice(0, 10),
      fecha_vencimiento: nuevo.fecha_vencimiento || null,
    });
    setNuevo({
      nombre: "",
      email: "",
      dominio: "",
      tipo: "individual",
      descuento_pct: "0",
      fecha_vencimiento: "",
    });
    setGuardando(false);
    cargar();
  }

  function diasParaVencer(fecha: string | null) {
    if (!fecha) return null;
    const dias = Math.ceil(
      (new Date(fecha).getTime() - now) / (1000 * 60 * 60 * 24)
    );
    return dias;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#17184B]">Clientes</h1>
        <p className="text-sm text-[#72767B]">
          Pruebas gratuitas individuales e inmobiliarias con beneficio por
          dominio corporativo — solapa &ldquo;Clientes&rdquo; del Excel.
        </p>
      </div>

      <form
        onSubmit={agregar}
        className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
          placeholder="Nombre *"
          value={nuevo.nombre}
          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Email"
          value={nuevo.email}
          onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Dominio (ej. groupblack.com.ar)"
          value={nuevo.dominio}
          onChange={(e) => setNuevo({ ...nuevo, dominio: e.target.value })}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={nuevo.tipo}
          onChange={(e) =>
            setNuevo({ ...nuevo, tipo: e.target.value as "individual" | "inmobiliaria" })
          }
        >
          <option value="individual">Individual</option>
          <option value="inmobiliaria">Inmobiliaria</option>
        </select>
        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={nuevo.fecha_vencimiento}
          onChange={(e) =>
            setNuevo({ ...nuevo, fecha_vencimiento: e.target.value })
          }
        />
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-[#17184B] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 md:col-span-6"
        >
          {guardando ? "Agregando..." : "+ Agregar cliente"}
        </button>
      </form>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#72767B] border-b">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Dominio</th>
              <th className="px-3 py-2">Descuento</th>
              <th className="px-3 py-2">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[#72767B]">
                  Sin clientes todavía.
                </td>
              </tr>
            )}
            {clientes.map((c) => {
              const dias = diasParaVencer(c.fecha_vencimiento);
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{c.nombre}</td>
                  <td className="px-3 py-2 capitalize">{c.tipo}</td>
                  <td className="px-3 py-2 text-[#72767B]">
                    {c.dominio ?? "-"}
                  </td>
                  <td className="px-3 py-2">{c.descuento_pct}%</td>
                  <td className="px-3 py-2">
                    {c.fecha_vencimiento ?? "-"}
                    {dias !== null && (
                      <span
                        className={`ml-2 text-xs ${
                          dias < 0
                            ? "text-red-600"
                            : dias <= 3
                            ? "text-orange-600"
                            : "text-[#72767B]"
                        }`}
                      >
                        {dias < 0 ? "vencido" : `${dias}d`}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
