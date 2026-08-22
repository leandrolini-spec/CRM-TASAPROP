"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFechaCorta } from "@/lib/date";

type EmpresaDatos = {
  id: number;
  cuit: string | null;
  razon_social: string | null;
  condicion_iva: string | null;
  banco: string | null;
  cbu: string | null;
  alias_cbu: string | null;
  titular_cuenta: string | null;
};

type Factura = {
  id: string;
  descripcion: string;
  monto: number | null;
  moneda: "ARS" | "USD";
  fecha: string | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  created_at: string;
};

export default function EmpresaClient({
  datosIniciales,
  facturasIniciales,
}: {
  datosIniciales: EmpresaDatos;
  facturasIniciales: Factura[];
}) {
  const supabase = createClient();

  const [fiscales, setFiscales] = useState({
    cuit: datosIniciales.cuit ?? "",
    razon_social: datosIniciales.razon_social ?? "",
    condicion_iva: datosIniciales.condicion_iva ?? "",
  });
  const [bancarios, setBancarios] = useState({
    banco: datosIniciales.banco ?? "",
    cbu: datosIniciales.cbu ?? "",
    alias_cbu: datosIniciales.alias_cbu ?? "",
    titular_cuenta: datosIniciales.titular_cuenta ?? "",
  });
  const [guardandoFiscales, setGuardandoFiscales] = useState(false);
  const [guardandoBancarios, setGuardandoBancarios] = useState(false);
  const [mensajeFiscales, setMensajeFiscales] = useState(false);
  const [mensajeBancarios, setMensajeBancarios] = useState(false);

  const [facturas, setFacturas] = useState<Factura[]>(facturasIniciales);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nuevaFactura, setNuevaFactura] = useState({
    descripcion: "",
    monto: "",
    moneda: "ARS" as "ARS" | "USD",
    fecha: new Date().toISOString().slice(0, 10),
  });
  const [subiendo, setSubiendo] = useState(false);

  async function guardarFiscales(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoFiscales(true);
    setMensajeFiscales(false);
    await supabase
      .from("empresa_datos")
      .update({ ...fiscales, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setGuardandoFiscales(false);
    setMensajeFiscales(true);
  }

  async function guardarBancarios(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoBancarios(true);
    setMensajeBancarios(false);
    await supabase
      .from("empresa_datos")
      .update({ ...bancarios, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setGuardandoBancarios(false);
    setMensajeBancarios(true);
  }

  async function subirFactura(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!nuevaFactura.descripcion.trim()) return;
    setSubiendo(true);

    let archivo_url: string | null = null;
    let archivo_nombre: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      // eslint-disable-next-line react-hooks/purity -- solo corre en el submit del form, nunca durante el render
      const path = `${Date.now()}-${file.name}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("empresa")
        .upload(path, file);
      if (!uploadError) {
        const { data } = supabase.storage.from("empresa").getPublicUrl(path);
        archivo_url = data.publicUrl;
        archivo_nombre = file.name;
      }
    }

    const { data: insertada } = await supabase
      .from("empresa_facturas")
      .insert({
        descripcion: nuevaFactura.descripcion,
        monto: nuevaFactura.monto ? Number(nuevaFactura.monto) : null,
        moneda: nuevaFactura.moneda,
        fecha: nuevaFactura.fecha || null,
        archivo_url,
        archivo_nombre,
      })
      .select()
      .single();

    if (insertada) setFacturas((prev) => [insertada as Factura, ...prev]);
    setNuevaFactura({
      descripcion: "",
      monto: "",
      moneda: "ARS",
      fecha: new Date().toISOString().slice(0, 10),
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSubiendo(false);
  }

  async function eliminarFactura(id: string) {
    if (!confirm("¿Eliminar esta factura?")) return;
    setFacturas((prev) => prev.filter((f) => f.id !== id));
    await supabase.from("empresa_facturas").delete().eq("id", id);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Datos de la Empresa</h1>
        <p className="text-sm text-brand-gray">
          Info de referencia para todo el equipo — CUIT, datos bancarios y facturas de gastos.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-brand-navy">Datos fiscales</h2>
        <form onSubmit={guardarFiscales} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-brand-gray mb-1">CUIT</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={fiscales.cuit}
                onChange={(e) => {
                  setFiscales({ ...fiscales, cuit: e.target.value });
                  setMensajeFiscales(false);
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-brand-gray mb-1">Condición IVA</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={fiscales.condicion_iva}
                onChange={(e) => {
                  setFiscales({ ...fiscales, condicion_iva: e.target.value });
                  setMensajeFiscales(false);
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-brand-gray mb-1">Razón social</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={fiscales.razon_social}
                onChange={(e) => {
                  setFiscales({ ...fiscales, razon_social: e.target.value });
                  setMensajeFiscales(false);
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={guardandoFiscales}
              className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {guardandoFiscales ? "Guardando..." : "Guardar"}
            </button>
            {mensajeFiscales && <span className="text-xs text-green-600">Guardado.</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-brand-navy">Datos bancarios</h2>
        <form onSubmit={guardarBancarios} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-brand-gray mb-1">Banco</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={bancarios.banco}
                onChange={(e) => {
                  setBancarios({ ...bancarios, banco: e.target.value });
                  setMensajeBancarios(false);
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-brand-gray mb-1">Titular de la cuenta</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={bancarios.titular_cuenta}
                onChange={(e) => {
                  setBancarios({ ...bancarios, titular_cuenta: e.target.value });
                  setMensajeBancarios(false);
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-brand-gray mb-1">CBU</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={bancarios.cbu}
                onChange={(e) => {
                  setBancarios({ ...bancarios, cbu: e.target.value });
                  setMensajeBancarios(false);
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-brand-gray mb-1">Alias</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={bancarios.alias_cbu}
                onChange={(e) => {
                  setBancarios({ ...bancarios, alias_cbu: e.target.value });
                  setMensajeBancarios(false);
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={guardandoBancarios}
              className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {guardandoBancarios ? "Guardando..." : "Guardar"}
            </button>
            {mensajeBancarios && <span className="text-xs text-green-600">Guardado.</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-brand-navy">Facturas de gastos</h2>

        <form
          onSubmit={subirFactura}
          className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
        >
          <input
            className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
            placeholder="Descripción *"
            value={nuevaFactura.descripcion}
            onChange={(e) =>
              setNuevaFactura({ ...nuevaFactura, descripcion: e.target.value })
            }
            required
          />
          <input
            type="date"
            className="border rounded-lg px-3 py-2 text-sm"
            value={nuevaFactura.fecha}
            onChange={(e) => setNuevaFactura({ ...nuevaFactura, fecha: e.target.value })}
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={nuevaFactura.moneda}
            onChange={(e) =>
              setNuevaFactura({ ...nuevaFactura, moneda: e.target.value as "ARS" | "USD" })
            }
          >
            <option value="ARS">$ ARS</option>
            <option value="USD">u$s USD</option>
          </select>
          <input
            type="number"
            step="0.01"
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Monto"
            value={nuevaFactura.monto}
            onChange={(e) => setNuevaFactura({ ...nuevaFactura, monto: e.target.value })}
          />
          <input ref={fileInputRef} type="file" className="text-xs md:col-span-1" />
          <button
            type="submit"
            disabled={subiendo}
            className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50 md:col-span-6"
          >
            {subiendo ? "Subiendo..." : "+ Agregar factura"}
          </button>
        </form>

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-gray border-b">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Archivo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-brand-gray">
                    Sin facturas todavía.
                  </td>
                </tr>
              )}
              {facturas.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{f.fecha ? formatFechaCorta(f.fecha) : "-"}</td>
                  <td className="px-3 py-2 font-medium">{f.descripcion}</td>
                  <td className="px-3 py-2">
                    {f.monto != null
                      ? `${f.moneda === "ARS" ? "$" : "u$s"}${Number(f.monto).toLocaleString(
                          f.moneda === "ARS" ? "es-AR" : "en-US"
                        )}`
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {f.archivo_url ? (
                      <a
                        href={f.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-navy underline"
                      >
                        Ver
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => eliminarFactura(f.id)}
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
    </div>
  );
}
