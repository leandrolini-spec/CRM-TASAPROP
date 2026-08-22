"use client";

import { useState, useCallback, useMemo } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatFechaCorta } from "@/lib/date";
import ImportExportButtons from "@/components/import-export-buttons";

type Pago = {
  id: string;
  fecha: string;
  cliente_nombre: string;
  monto: number;
  descuento_mp: number;
  total_recibir: number;
  medio_pago: string | null;
  transferido: boolean;
};

function esTarjeta(medioPago: string | null) {
  return !!medioPago && !medioPago.toLowerCase().includes("dinero en mp");
}

export default function PagosClient({ initial }: { initial: Pago[] }) {
  const supabase = createClient();
  const [pagos, setPagos] = useState<Pago[]>(initial);
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroTarjeta, setFiltroTarjeta] = useState("");
  const [filtroTransferido, setFiltroTransferido] = useState<"" | "si" | "no">("");
  const [nuevo, setNuevo] = useState({
    cliente_nombre: "",
    monto: "",
    descuento_mp: "0",
    medio_pago: "Mercado Pago",
  });
  const [guardando, setGuardando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

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

  async function actualizarTransferido(id: string, valor: boolean) {
    setPagos((prev) => prev.map((p) => (p.id === id ? { ...p, transferido: valor } : p)));
    const { error } = await supabase.from("pagos").update({ transferido: valor }).eq("id", id);
    if (error) {
      alert("No se pudo guardar el cambio: " + error.message);
      cargar();
    }
  }

  async function actualizarTransferidoMasivo(ids: string[], valor: boolean) {
    if (ids.length === 0) return;
    setPagos((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, transferido: valor } : p))
    );
    const { error } = await supabase.from("pagos").update({ transferido: valor }).in("id", ids);
    if (error) {
      alert("No se pudo guardar el cambio: " + error.message);
      cargar();
    } else {
      setSeleccionados(new Set());
    }
  }

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tarjetas = useMemo(() => {
    const m = new Map<string, { cantidad: number; total: number }>();
    for (const p of pagos) {
      if (!esTarjeta(p.medio_pago)) continue;
      const key = p.medio_pago as string;
      const actual = m.get(key) ?? { cantidad: 0, total: 0 };
      actual.cantidad += 1;
      actual.total += Number(p.total_recibir);
      m.set(key, actual);
    }
    return [...m.entries()]
      .map(([medio, datos]) => ({ medio, ...datos }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [pagos]);

  const filtrados = pagos.filter((p) => {
    if (filtroMes && !p.fecha.startsWith(filtroMes)) return false;
    if (filtroTarjeta && p.medio_pago !== filtroTarjeta) return false;
    if (filtroTransferido === "si" && !p.transferido) return false;
    if (filtroTransferido === "no" && p.transferido) return false;
    return true;
  });

  // Acciones en lote solo actúan sobre lo seleccionado que sigue visible bajo
  // el filtro actual — si el usuario filtra después de seleccionar, lo que
  // quedó oculto no se toca ni cuenta en el contador.
  const idsFiltrados = new Set(filtrados.map((p) => p.id));
  const seleccionadosVisibles = [...seleccionados].filter((id) => idsFiltrados.has(id));

  const totalFiltrado = filtrados.reduce((acc, p) => acc + Number(p.total_recibir), 0);
  const totalRecibido = pagos.reduce((acc, p) => acc + Number(p.total_recibir), 0);

  const totalTransferido = filtrados
    .filter((p) => p.transferido)
    .reduce((acc, p) => acc + Number(p.total_recibir), 0);
  const totalPendiente = filtrados
    .filter((p) => !p.transferido)
    .reduce((acc, p) => acc + Number(p.total_recibir), 0);

  const historialTarjeta = filtroTarjeta
    ? pagos.filter((p) => p.medio_pago === filtroTarjeta)
    : [];
  const historialTotal = historialTarjeta.reduce(
    (acc, p) => acc + Number(p.total_recibir),
    0
  );

  const hayFiltros = Boolean(filtroMes || filtroTarjeta || filtroTransferido);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy">Ingresos MP</h1>
        <ImportExportButtons entity="pagos" onImported={cargar} />
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
          className="rounded-lg bg-brand-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? "Agregando..." : "+ Agregar pago"}
        </button>
      </form>

      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-brand-gray mb-1">Mes</label>
          <input
            type="month"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs text-brand-gray mb-1">
            Cliente recurrente (por tarjeta)
          </label>
          <select
            value={filtroTarjeta}
            onChange={(e) => setFiltroTarjeta(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="">Todos</option>
            {tarjetas.map((t) => (
              <option key={t.medio} value={t.medio}>
                {t.medio} ({t.cantidad} pagos)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-brand-gray mb-1">Transferencia a Tasaprop</label>
          <select
            value={filtroTransferido}
            onChange={(e) => setFiltroTransferido(e.target.value as "" | "si" | "no")}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="no">Pendiente de transferir</option>
            <option value="si">Ya transferido</option>
          </select>
        </div>
        {hayFiltros && (
          <button
            onClick={() => {
              setFiltroMes("");
              setFiltroTarjeta("");
              setFiltroTransferido("");
            }}
            className="text-sm text-brand-gray hover:text-brand-navy underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-brand-gray">
            {hayFiltros ? "Total del filtro" : "Total recibido (histórico)"}
          </p>
          <p className="text-xl font-bold text-brand-navy">
            ${(hayFiltros ? totalFiltrado : totalRecibido).toLocaleString("es-AR")}
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-brand-gray">Tasaciones realizadas</p>
          <p className="text-xl font-bold text-brand-navy">
            {(hayFiltros ? filtrados.length : pagos.length).toLocaleString("es-AR")}
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-brand-gray flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-green-600" /> Ya transferido a Tasaprop
          </p>
          <p className="text-xl font-bold text-green-700">
            ${totalTransferido.toLocaleString("es-AR")}
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-brand-gray flex items-center gap-1.5">
            <Clock size={14} className="text-orange-500" /> Pendiente de transferir
          </p>
          <p className="text-xl font-bold text-orange-600">
            ${totalPendiente.toLocaleString("es-AR")}
          </p>
        </div>
      </div>

      {filtroTarjeta && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-brand-gray">Historial de esta tarjeta</p>
          <p className="text-xl font-bold text-brand-navy">
            ${historialTotal.toLocaleString("es-AR")}{" "}
            <span className="text-sm font-normal text-brand-gray">
              · {historialTarjeta.length} tasaciones en total
            </span>
          </p>
        </div>
      )}

      {seleccionadosVisibles.length > 0 && (
        <div className="bg-brand-navy rounded-xl p-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-white">
            {seleccionadosVisibles.length} pago{seleccionadosVisibles.length === 1 ? "" : "s"} seleccionado
            {seleccionadosVisibles.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => actualizarTransferidoMasivo(seleccionadosVisibles, true)}
              className="rounded-lg bg-white text-brand-navy text-sm font-medium px-3 py-1.5 hover:opacity-90"
            >
              Marcar como transferido
            </button>
            <button
              onClick={() => actualizarTransferidoMasivo(seleccionadosVisibles, false)}
              className="rounded-lg border border-white text-white text-sm font-medium px-3 py-1.5 hover:bg-white/10"
            >
              Marcar como pendiente
            </button>
            <button
              onClick={() => setSeleccionados(new Set())}
              className="text-sm text-white/70 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b">
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={filtrados.length > 0 && filtrados.every((p) => seleccionados.has(p.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSeleccionados(new Set(filtrados.map((p) => p.id)));
                    } else {
                      setSeleccionados(new Set());
                    }
                  }}
                  title="Seleccionar todos (para acciones en lote)"
                />
              </th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Monto</th>
              <th className="px-3 py-2">Descuento MP</th>
              <th className="px-3 py-2">Total recibido</th>
              <th className="px-3 py-2">Medio</th>
              <th className="px-3 py-2">Transferido</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-brand-gray">
                  Sin pagos para este filtro.
                </td>
              </tr>
            )}
            {filtrados.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(p.id)}
                    onChange={() => toggleSeleccion(p.id)}
                  />
                </td>
                <td className="px-3 py-2">{formatFechaCorta(p.fecha)}</td>
                <td className="px-3 py-2 font-medium">{p.cliente_nombre}</td>
                <td className="px-3 py-2">${Number(p.monto).toLocaleString("es-AR")}</td>
                <td className="px-3 py-2 text-red-600">
                  -${Number(p.descuento_mp).toLocaleString("es-AR")}
                </td>
                <td className="px-3 py-2 font-medium">
                  ${Number(p.total_recibir).toLocaleString("es-AR")}
                </td>
                <td className="px-3 py-2 text-brand-gray">{p.medio_pago ?? "-"}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => actualizarTransferido(p.id, !p.transferido)}
                    title={p.transferido ? "Transferido — tocá para marcar pendiente" : "Marcar como transferido"}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition ${
                      p.transferido
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    }`}
                  >
                    {p.transferido ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {p.transferido ? "Transferido" : "Pendiente"}
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
