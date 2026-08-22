"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import ImportExportButtons from "@/components/import-export-buttons";
import { formatFechaCorta } from "@/lib/date";

type Gasto = {
  id: string;
  fecha: string;
  descripcion: string;
  categoria: string;
  moneda: "ARS" | "USD";
  monto: number;
  notas: string | null;
};

const CATEGORIAS = [
  "Marketing y difusión",
  "Software y herramientas",
  "Oficina",
  "Impuestos",
  "Comisiones bancarias",
  "Sueldos y honorarios",
  "Otro",
];

export default function GastosClient({ initial }: { initial: Gasto[] }) {
  const supabase = createClient();
  const [gastos, setGastos] = useState<Gasto[]>(initial);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroMoneda, setFiltroMoneda] = useState<"ARS" | "USD" | "">("");
  const [nuevo, setNuevo] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: "",
    categoria: CATEGORIAS[0],
    moneda: "ARS" as "ARS" | "USD",
    monto: "",
    notas: "",
  });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("gastos")
      .select("*")
      .order("fecha", { ascending: false });
    setGastos((data as Gasto[]) ?? []);
  }, [supabase]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.descripcion.trim() || !nuevo.monto) return;
    setGuardando(true);
    await supabase.from("gastos").insert({
      fecha: nuevo.fecha,
      descripcion: nuevo.descripcion,
      categoria: nuevo.categoria,
      moneda: nuevo.moneda,
      monto: Number(nuevo.monto),
      notas: nuevo.notas || null,
    });
    setNuevo({
      fecha: new Date().toISOString().slice(0, 10),
      descripcion: "",
      categoria: CATEGORIAS[0],
      moneda: "ARS",
      monto: "",
      notas: "",
    });
    setGuardando(false);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    setGastos((prev) => prev.filter((g) => g.id !== id));
    await supabase.from("gastos").delete().eq("id", id);
  }

  const filtrados = gastos.filter(
    (g) =>
      (!filtroCategoria || g.categoria === filtroCategoria) &&
      (!filtroMoneda || g.moneda === filtroMoneda)
  );

  const totales = useMemo(() => {
    return filtrados.reduce(
      (acc, g) => {
        acc[g.moneda] += Number(g.monto);
        return acc;
      },
      { ARS: 0, USD: 0 }
    );
  }, [filtrados]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Gastos</h1>
          <p className="text-sm text-brand-gray">
            Gastos de la empresa, categorizados y en pesos o dólares (sin
            conversión automática entre monedas).
          </p>
        </div>
        <ImportExportButtons entity="gastos" onImported={cargar} />
      </div>

      <form
        onSubmit={agregar}
        className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={nuevo.fecha}
          onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
          placeholder="Descripción *"
          value={nuevo.descripcion}
          onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
          required
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={nuevo.categoria}
          onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={nuevo.moneda}
          onChange={(e) =>
            setNuevo({ ...nuevo, moneda: e.target.value as "ARS" | "USD" })
          }
        >
          <option value="ARS">$ ARS</option>
          <option value="USD">u$s USD</option>
        </select>
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
          className="border rounded-lg px-3 py-2 text-sm md:col-span-5"
          placeholder="Notas"
          value={nuevo.notas}
          onChange={(e) => setNuevo({ ...nuevo, notas: e.target.value })}
        />
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-brand-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? "Agregando..." : "+ Agregar gasto"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filtroMoneda}
          onChange={(e) => setFiltroMoneda(e.target.value as "ARS" | "USD" | "")}
        >
          <option value="">Ambas monedas</option>
          <option value="ARS">Solo $ ARS</option>
          <option value="USD">Solo u$s USD</option>
        </select>

        <div className="ml-auto flex gap-3">
          <div className="bg-white rounded-xl border px-4 py-2">
            <span className="text-xs text-brand-gray">Total ARS </span>
            <span className="font-bold text-brand-navy">
              ${totales.ARS.toLocaleString("es-AR")}
            </span>
          </div>
          <div className="bg-white rounded-xl border px-4 py-2">
            <span className="text-xs text-brand-gray">Total USD </span>
            <span className="font-bold text-brand-navy">
              u$s{totales.USD.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Monto</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-brand-gray">
                  Sin gastos todavía.
                </td>
              </tr>
            )}
            {filtrados.map((g) => (
              <tr key={g.id} className="border-b last:border-0">
                <td className="px-3 py-2">{formatFechaCorta(g.fecha)}</td>
                <td className="px-3 py-2 font-medium">{g.descripcion}</td>
                <td className="px-3 py-2 text-brand-gray">{g.categoria}</td>
                <td className="px-3 py-2">
                  {g.moneda === "ARS" ? "$" : "u$s"}
                  {Number(g.monto).toLocaleString(
                    g.moneda === "ARS" ? "es-AR" : "en-US"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => eliminar(g.id)}
                    className="text-xs text-brand-gray hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
