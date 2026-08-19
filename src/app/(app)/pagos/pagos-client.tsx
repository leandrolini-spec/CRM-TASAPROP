"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Pago = {
  id: string;
  fecha: string;
  cliente_nombre: string;
  monto: number;
  descuento_mp: number;
  total_recibir: number;
  medio_pago: string | null;
};

export default function PagosClient({ initial }: { initial: Pago[] }) {
  const supabase = createClient();
  const [pagos, setPagos] = useState<Pago[]>(initial);
  const [nuevo, setNuevo] = useState({
    cliente_nombre: "",
    monto: "",
    descuento_mp: "0",
    medio_pago: "Mercado Pago",
  });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("pagos")
      .select("*")
      .order("fecha", { ascending: false });
    setPagos((data as Pago[]) ?? []);
  }, [supabase]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.cliente_nombre.trim() || !nuevo.monto) return;
    setGuardando(true);
    await supabase.from("pagos").insert({
      cliente_nombre: nuevo.cliente_nombre,
      monto: Number(nuevo.monto),
      descuento_mp: Number(nuevo.descuento_mp) || 0,
      medio_pago: nuevo.medio_pago || null,
    });
    setNuevo({
      cliente_nombre: "",
      monto: "",
      descuento_mp: "0",
      medio_pago: "Mercado Pago",
    });
    setGuardando(false);
    cargar();
  }

  const totalRecibido = pagos.reduce((acc, p) => acc + Number(p.total_recibir), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#17184B]">Pagos</h1>
        <p className="text-sm text-[#72767B]">
          Solapa &ldquo;Pagos&rdquo; del Excel — total recibido calculado
          solo (Monto − Descuento MP).
        </p>
      </div>

      <form
        onSubmit={agregar}
        className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
          placeholder="Cliente *"
          value={nuevo.cliente_nombre}
          onChange={(e) => setNuevo({ ...nuevo, cliente_nombre: e.target.value })}
          required
        />
        <input
          type="number"
          step="0.01"
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Monto *"
          value={nuevo.monto}
          onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })}
          required
        />
        <input
          type="number"
          step="0.01"
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Descuento MP"
          value={nuevo.descuento_mp}
          onChange={(e) => setNuevo({ ...nuevo, descuento_mp: e.target.value })}
        />
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-[#17184B] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? "Agregando..." : "+ Agregar pago"}
        </button>
      </form>

      <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
        <span className="text-sm text-[#72767B]">Total recibido (histórico)</span>
        <span className="text-xl font-bold text-[#17184B]">
          ${totalRecibido.toLocaleString("es-AR")}
        </span>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#72767B] border-b">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Monto</th>
              <th className="px-3 py-2">Descuento MP</th>
              <th className="px-3 py-2">Total recibido</th>
              <th className="px-3 py-2">Medio</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[#72767B]">
                  Sin pagos todavía.
                </td>
              </tr>
            )}
            {pagos.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-3 py-2">{p.fecha}</td>
                <td className="px-3 py-2 font-medium">{p.cliente_nombre}</td>
                <td className="px-3 py-2">${Number(p.monto).toLocaleString("es-AR")}</td>
                <td className="px-3 py-2 text-red-600">
                  -${Number(p.descuento_mp).toLocaleString("es-AR")}
                </td>
                <td className="px-3 py-2 font-medium">
                  ${Number(p.total_recibir).toLocaleString("es-AR")}
                </td>
                <td className="px-3 py-2 text-[#72767B]">{p.medio_pago ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
