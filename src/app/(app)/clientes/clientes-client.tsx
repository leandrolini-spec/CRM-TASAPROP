"use client";

import { useState, useCallback } from "react";
import { X, UserPlus, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatFechaCorta } from "@/lib/date";

type Cliente = {
  id: string;
  nombre: string;
  empresa: string | null;
  email: string | null;
  telefono: string | null;
  dominio: string | null;
  tipo: "individual" | "inmobiliaria";
  descuento_pct: number;
  fecha_inicio_prueba: string | null;
  fecha_vencimiento: string | null;
  notas: string | null;
  categoria: string | null;
  estado: "Alianza" | "Prueba" | "Seguimiento" | "Descartado";
  // OJO: distinto de contacto_id (que usan Contactos/Seguimiento para marcar
  // "este cliente fue derivado DESDE ese contacto"). Este es el sentido
  // inverso: "este cliente fue migrado HACIA este contacto nuevo".
  contacto_derivado_id: string | null;
};

const ESTADOS = ["Alianza", "Prueba", "Seguimiento", "Descartado"] as const;

const ESTADO_COLOR: Record<string, string> = {
  Alianza: "bg-green-100 text-green-700",
  Prueba: "bg-brand-cyan/20 text-brand-navy",
  Seguimiento: "bg-yellow-100 text-yellow-700",
  Descartado: "bg-red-100 text-red-700",
};

const CLIENTE_VACIO = {
  nombre: "",
  empresa: "",
  email: "",
  telefono: "",
  dominio: "",
  tipo: "individual" as "individual" | "inmobiliaria",
  descuento_pct: "0",
  fecha_inicio_prueba: "",
  fecha_vencimiento: "",
  notas: "",
  categoria: "",
  estado: "Prueba" as Cliente["estado"],
};

export default function ClientesClient({ initial }: { initial: Cliente[] }) {
  const supabase = createClient();
  const [clientes, setClientes] = useState<Cliente[]>(initial);
  const [now] = useState(() => Date.now());
  const [nuevo, setNuevo] = useState({
    nombre: "",
    empresa: "",
    email: "",
    telefono: "",
    tipo: "individual" as "individual" | "inmobiliaria",
    fecha_vencimiento: "",
  });
  const [guardando, setGuardando] = useState(false);

  const [verDescartados, setVerDescartados] = useState(false);
  const [clienteAbierto, setClienteAbierto] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(CLIENTE_VACIO);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [migrandoId, setMigrandoId] = useState<string | null>(null);

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
      empresa: nuevo.empresa || null,
      email: nuevo.email || null,
      telefono: nuevo.telefono || null,
      tipo: nuevo.tipo,
      fecha_inicio_prueba: new Date().toISOString().slice(0, 10),
      fecha_vencimiento: nuevo.fecha_vencimiento || null,
    });
    setNuevo({
      nombre: "",
      empresa: "",
      email: "",
      telefono: "",
      tipo: "individual",
      fecha_vencimiento: "",
    });
    setGuardando(false);
    cargar();
  }

  function abrirCliente(c: Cliente) {
    setClienteAbierto(c.id);
    setEditForm({
      nombre: c.nombre,
      empresa: c.empresa ?? "",
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      dominio: c.dominio ?? "",
      tipo: c.tipo,
      descuento_pct: String(c.descuento_pct),
      fecha_inicio_prueba: c.fecha_inicio_prueba ?? "",
      fecha_vencimiento: c.fecha_vencimiento ?? "",
      notas: c.notas ?? "",
      categoria: c.categoria ?? "",
      estado: c.estado,
    });
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteAbierto) return;
    setGuardandoEdicion(true);
    await supabase
      .from("clientes")
      .update({
        nombre: editForm.nombre,
        empresa: editForm.empresa || null,
        email: editForm.email || null,
        telefono: editForm.telefono || null,
        dominio: editForm.dominio || null,
        tipo: editForm.tipo,
        descuento_pct: Number(editForm.descuento_pct) || 0,
        fecha_inicio_prueba: editForm.fecha_inicio_prueba || null,
        fecha_vencimiento: editForm.fecha_vencimiento || null,
        notas: editForm.notas || null,
        categoria: editForm.categoria || null,
        estado: editForm.estado,
      })
      .eq("id", clienteAbierto);
    setGuardandoEdicion(false);
    setClienteAbierto(null);
    cargar();
  }

  async function eliminarCliente() {
    if (!clienteAbierto) return;
    if (
      !confirm(
        "¿Eliminar este cliente definitivamente? No se puede deshacer.\n\nSi solo venció la prueba, no hace falta borrarlo: al vencer sale solo de la lista (queda como Descartado)."
      )
    )
      return;
    await supabase.from("clientes").delete().eq("id", clienteAbierto);
    setClienteAbierto(null);
    cargar();
  }

  async function migrarAContactos(c: Cliente) {
    if (c.contacto_derivado_id || migrandoId) return;
    setMigrandoId(c.id);

    const inmobiliaria = (c.empresa || c.nombre).trim();
    const notasLineas = [
      c.empresa ? `Contacto: ${c.nombre}` : null,
      c.notas,
    ].filter(Boolean);

    const { data: contacto, error: insertError } = await supabase
      .from("contactos")
      .insert({
        inmobiliaria,
        email: c.email,
        telefono: c.telefono,
        notas: notasLineas.length > 0 ? notasLineas.join("\n") : null,
        fuente: "Pruebas / Alianzas",
      })
      .select()
      .single();

    if (insertError || !contacto) {
      alert("No se pudo migrar a Contactos: " + (insertError?.message ?? "error desconocido"));
      setMigrandoId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("clientes")
      .update({ contacto_derivado_id: contacto.id })
      .eq("id", c.id);

    if (updateError) {
      alert("Se creó el contacto pero no se pudo marcar como migrado: " + updateError.message);
    } else {
      setClientes((prev) =>
        prev.map((cl) => (cl.id === c.id ? { ...cl, contacto_derivado_id: contacto.id } : cl))
      );
    }
    setMigrandoId(null);
  }

  function diasParaVencer(fecha: string | null) {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha).getTime() - now) / (1000 * 60 * 60 * 24));
  }

  const descartados = clientes.filter((c) => c.estado === "Descartado");
  const visibles = verDescartados
    ? clientes
    : clientes.filter((c) => c.estado !== "Descartado");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Pruebas / Alianzas</h1>
        <p className="text-sm text-brand-gray">
          Las pruebas vencidas sin pasar a Alianza salen solas de esta lista.
        </p>
      </div>

      <form
        onSubmit={agregar}
        className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Nombre *"
          value={nuevo.nombre}
          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Empresa"
          value={nuevo.empresa}
          onChange={(e) => setNuevo({ ...nuevo, empresa: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Email"
          value={nuevo.email}
          onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Teléfono"
          value={nuevo.telefono}
          onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
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
          onChange={(e) => setNuevo({ ...nuevo, fecha_vencimiento: e.target.value })}
        />
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-brand-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 md:col-span-6"
        >
          {guardando ? "Agregando..." : "+ Agregar cliente"}
        </button>
      </form>

      {descartados.length > 0 && (
        <button
          onClick={() => setVerDescartados((v) => !v)}
          className="text-sm text-brand-gray hover:text-brand-navy underline"
        >
          {verDescartados
            ? "Ocultar descartados"
            : `Ver descartados (${descartados.length})`}
        </button>
      )}

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Vencimiento</th>
              <th className="px-3 py-2">Contactos</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-brand-gray">
                  Sin clientes todavía.
                </td>
              </tr>
            )}
            {visibles.map((c) => {
              const dias = diasParaVencer(c.fecha_vencimiento);
              return (
                <tr
                  key={c.id}
                  onClick={() => abrirCliente(c)}
                  className="border-b last:border-0 cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-3 py-2 font-medium">{c.nombre}</td>
                  <td className="px-3 py-2 text-brand-gray">{c.empresa ?? "-"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ESTADO_COLOR[c.estado] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {c.fecha_vencimiento ? formatFechaCorta(c.fecha_vencimiento) : "-"}
                    {dias !== null && (
                      <span
                        className={`ml-2 text-xs ${
                          dias < 0
                            ? "text-red-600"
                            : dias <= 3
                            ? "text-orange-600"
                            : "text-brand-gray"
                        }`}
                      >
                        {dias < 0 ? "vencido" : `${dias}d`}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    {c.contacto_derivado_id ? (
                      <span
                        title="Ya está en la lista general de Contactos"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700"
                      >
                        <CheckCircle2 size={14} />
                        Migrado
                      </span>
                    ) : (
                      <button
                        onClick={() => migrarAContactos(c)}
                        disabled={migrandoId === c.id}
                        title="Enviar a la lista general de Contactos"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-navy hover:opacity-70 disabled:opacity-50"
                      >
                        <UserPlus size={14} />
                        {migrandoId === c.id ? "Enviando..." : "Enviar a Contactos"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {clienteAbierto && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
          onClick={() => setClienteAbierto(null)}
        >
          <div
            className="bg-white rounded-xl border max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-brand-navy">Editar cliente</h3>
              <button
                onClick={() => setClienteAbierto(null)}
                className="text-brand-gray hover:text-brand-navy"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarEdicion} className="p-5 space-y-3">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Nombre *"
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                required
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Empresa"
                value={editForm.empresa}
                onChange={(e) => setEditForm({ ...editForm, empresa: e.target.value })}
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Teléfono"
                value={editForm.telefono}
                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={editForm.tipo}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      tipo: e.target.value as "individual" | "inmobiliaria",
                    })
                  }
                >
                  <option value="individual">Individual</option>
                  <option value="inmobiliaria">Inmobiliaria</option>
                </select>
                <select
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={editForm.estado}
                  onChange={(e) =>
                    setEditForm({ ...editForm, estado: e.target.value as Cliente["estado"] })
                  }
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Dominio (ej. groupblack.com.ar)"
                value={editForm.dominio}
                onChange={(e) => setEditForm({ ...editForm, dominio: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Descuento %"
                  value={editForm.descuento_pct}
                  onChange={(e) => setEditForm({ ...editForm, descuento_pct: e.target.value })}
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Categoría"
                  value={editForm.categoria}
                  onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-brand-gray mb-1">Inicio prueba</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={editForm.fecha_inicio_prueba}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fecha_inicio_prueba: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-gray mb-1">Vencimiento</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={editForm.fecha_vencimiento}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fecha_vencimiento: e.target.value })
                    }
                  />
                </div>
              </div>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Notas"
                rows={3}
                value={editForm.notas}
                onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={eliminarCliente}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Eliminar cliente
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
                >
                  {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
