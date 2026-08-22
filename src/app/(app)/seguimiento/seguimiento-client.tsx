"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ContactoModal, { type Contacto } from "@/components/contacto-modal";
import ContactoRowIcons from "@/components/contacto-row-icons";
import { IconTrash, IconUserPlus } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";

type Etapa = { id: string; nombre: string; color: string; orden: number };

const PALETA = ["#3CC8DD", "#D8E63C", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#9ca3af", "#0ea5e9"];

export default function SeguimientoClient({
  initial,
  etapasIniciales,
  derivados,
}: {
  initial: Contacto[];
  etapasIniciales: Etapa[];
  derivados: string[];
}) {
  const supabase = createClient();
  const [contactos, setContactos] = useState<Contacto[]>(initial);
  const [convertidos, setConvertidos] = useState<Set<string>>(new Set(derivados));
  const [etapas, setEtapas] = useState<Etapa[]>(
    [...etapasIniciales].sort((a, b) => a.orden - b.orden)
  );
  const [filtroBarrio, setFiltroBarrio] = useState("");
  const [filtroInmobiliaria, setFiltroInmobiliaria] = useState("");
  const [contactoAbierto, setContactoAbierto] = useState<Contacto | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [arrastrandoColumnaId, setArrastrandoColumnaId] = useState<string | null>(null);
  const [sobreColumna, setSobreColumna] = useState<string | null>(null);
  const [editandoEtapa, setEditandoEtapa] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("contactos")
      .select("*")
      .eq("archivado", false)
      .eq("excluido_seguimiento", false)
      .order("created_at", { ascending: false });
    setContactos((data as Contacto[]) ?? []);
  }, [supabase]);

  async function moverEstado(id: string, estado: string) {
    setContactos((prev) => prev.map((c) => (c.id === id ? { ...c, estado } : c)));
    await supabase.from("contactos").update({ estado }).eq("id", id);
  }

  async function reordenarColumnas(idArrastrada: string, idDestino: string) {
    const fromIdx = etapas.findIndex((e) => e.id === idArrastrada);
    const toIdx = etapas.findIndex((e) => e.id === idDestino);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const lista = [...etapas];
    const [movida] = lista.splice(fromIdx, 1);
    lista.splice(toIdx, 0, movida);
    const reordenada = lista.map((e, i) => ({ ...e, orden: i + 1 }));
    setEtapas(reordenada);
    await Promise.all(
      reordenada.map((e) =>
        supabase.from("etapas_seguimiento").update({ orden: e.orden }).eq("id", e.id)
      )
    );
  }

  async function derivarACliente(e: React.MouseEvent, contacto: Contacto) {
    e.stopPropagation();
    if (convertidos.has(contacto.id)) {
      alert("Este contacto ya fue derivado a Pruebas / Alianzas.");
      return;
    }
    setConvertidos((prev) => new Set(prev).add(contacto.id));
    await supabase.from("clientes").insert({
      nombre: contacto.inmobiliaria,
      email: contacto.email,
      tipo: "inmobiliaria",
      contacto_id: contacto.id,
      notas: `Derivado desde Seguimiento${contacto.barrio ? ` (${contacto.barrio})` : ""}`,
    });
  }

  async function eliminarRapido(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (
      !confirm(
        "¿Sacar esta tarjeta del pipeline? Sigue existiendo en Contactos y en Pruebas / Alianzas si ya fue derivado."
      )
    )
      return;
    setContactos((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("contactos").update({ excluido_seguimiento: true }).eq("id", id);
  }

  async function renombrarEtapa(etapa: Etapa, nombreNuevo: string) {
    const nombre = nombreNuevo.trim();
    setEditandoEtapa(null);
    if (!nombre || nombre === etapa.nombre) return;
    if (etapas.some((e) => e.id !== etapa.id && e.nombre.toLowerCase() === nombre.toLowerCase())) {
      alert("Ya existe una columna con ese nombre.");
      return;
    }
    setEtapas((prev) => prev.map((e) => (e.id === etapa.id ? { ...e, nombre } : e)));
    setContactos((prev) =>
      prev.map((c) => (c.estado === etapa.nombre ? { ...c, estado: nombre } : c))
    );
    await supabase.from("etapas_seguimiento").update({ nombre }).eq("id", etapa.id);
    await supabase
      .from("contactos")
      .update({ estado: nombre })
      .eq("estado", etapa.nombre)
      .eq("archivado", false);
  }

  async function agregarEtapa() {
    const nombre = prompt("Nombre de la nueva columna:");
    if (!nombre || !nombre.trim()) return;
    const limpio = nombre.trim();
    if (etapas.some((e) => e.nombre.toLowerCase() === limpio.toLowerCase())) {
      alert("Ya existe una columna con ese nombre.");
      return;
    }
    const orden = etapas.length ? Math.max(...etapas.map((e) => e.orden)) + 1 : 1;
    const color = PALETA[etapas.length % PALETA.length];
    const { data } = await supabase
      .from("etapas_seguimiento")
      .insert({ nombre: limpio, orden, color })
      .select()
      .single();
    if (data) setEtapas((prev) => [...prev, data as Etapa]);
  }

  async function eliminarEtapa(etapa: Etapa) {
    if (etapas.length <= 1) {
      alert("Tiene que quedar al menos una columna.");
      return;
    }
    const enEsaEtapa = contactos.filter((c) => c.estado === etapa.nombre);
    const destino = etapas.find((e) => e.id !== etapa.id);
    const mensaje =
      enEsaEtapa.length > 0
        ? `Esta columna tiene ${enEsaEtapa.length} contacto(s). Se van a mover a "${destino?.nombre}". ¿Eliminar la columna "${etapa.nombre}"?`
        : `¿Eliminar la columna "${etapa.nombre}"?`;
    if (!confirm(mensaje)) return;

    if (enEsaEtapa.length > 0 && destino) {
      setContactos((prev) =>
        prev.map((c) => (c.estado === etapa.nombre ? { ...c, estado: destino.nombre } : c))
      );
      await supabase
        .from("contactos")
        .update({ estado: destino.nombre })
        .eq("estado", etapa.nombre)
        .eq("archivado", false);
    }
    setEtapas((prev) => prev.filter((e) => e.id !== etapa.id));
    await supabase.from("etapas_seguimiento").delete().eq("id", etapa.id);
  }

  const filtrados = contactos.filter((c) => {
    if (filtroBarrio && !c.barrio?.toLowerCase().includes(filtroBarrio.toLowerCase()))
      return false;
    if (
      filtroInmobiliaria &&
      !c.inmobiliaria.toLowerCase().includes(filtroInmobiliaria.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Seguimiento</h1>
        <p className="text-sm text-brand-gray">
          Pipeline de oportunidades — arrastrá una tarjeta para cambiarla de etapa. Tocá el
          nombre de una columna para renombrarla.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-brand-gray mb-1">Localidad</label>
          <input
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            placeholder="Filtrar por localidad..."
            value={filtroBarrio}
            onChange={(e) => setFiltroBarrio(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-brand-gray mb-1">Inmobiliaria</label>
          <input
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            placeholder="Filtrar por nombre..."
            value={filtroInmobiliaria}
            onChange={(e) => setFiltroInmobiliaria(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {etapas.map((etapa) => {
          const tarjetas = filtrados.filter((c) => c.estado === etapa.nombre);
          return (
            <div
              key={etapa.id}
              onDragOver={(e) => {
                e.preventDefault();
                setSobreColumna(etapa.nombre);
              }}
              onDragLeave={() => setSobreColumna((s) => (s === etapa.nombre ? null : s))}
              onDrop={() => {
                if (arrastrandoColumnaId) {
                  reordenarColumnas(arrastrandoColumnaId, etapa.id);
                } else if (arrastrando) {
                  moverEstado(arrastrando, etapa.nombre);
                }
                setArrastrando(null);
                setArrastrandoColumnaId(null);
                setSobreColumna(null);
              }}
              className={`shrink-0 w-64 rounded-xl border bg-white transition ${
                sobreColumna === etapa.nombre ? "ring-2 ring-brand-navy" : ""
              } ${arrastrandoColumnaId === etapa.id ? "opacity-40" : ""}`}
            >
              <div
                draggable={editandoEtapa !== etapa.id}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setArrastrandoColumnaId(etapa.id);
                }}
                onDragEnd={() => setArrastrandoColumnaId(null)}
                title="Arrastrá para reordenar la columna"
                className="px-3 py-2.5 rounded-t-xl border-b flex items-center gap-1.5 cursor-grab active:cursor-grabbing"
                style={{ borderTop: `3px solid ${etapa.color}` }}
              >
                {editandoEtapa === etapa.id ? (
                  <input
                    autoFocus
                    defaultValue={etapa.nombre}
                    onBlur={(e) => renombrarEtapa(etapa, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditandoEtapa(null);
                    }}
                    className="text-sm font-semibold text-brand-navy border rounded px-1 py-0.5 min-w-0 flex-1"
                  />
                ) : (
                  <button
                    onClick={() => setEditandoEtapa(etapa.id)}
                    title="Renombrar columna"
                    className="text-sm font-semibold text-brand-navy hover:underline text-left truncate flex-1 min-w-0"
                  >
                    {etapa.nombre}
                  </button>
                )}
                <Badge tone="gray" className="shrink-0">
                  {tarjetas.length}
                </Badge>
                <button
                  onClick={() => eliminarEtapa(etapa)}
                  title="Eliminar columna"
                  className="shrink-0 text-brand-gray hover:text-red-600"
                >
                  <IconTrash width={13} height={13} />
                </button>
              </div>

              <div
                className="p-2 space-y-2 min-h-[80px] max-h-[70vh] overflow-y-auto rounded-b-xl"
                style={{ backgroundColor: `${etapa.color}14` }}
              >
                {tarjetas.length === 0 && (
                  <p className="text-xs text-brand-gray text-center py-4">Sin tarjetas</p>
                )}
                {tarjetas.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setArrastrando(c.id)}
                    onDragEnd={() => setArrastrando(null)}
                    onClick={() => setContactoAbierto(c)}
                    className={`bg-white rounded-lg border border-gray-200 p-2.5 cursor-pointer hover:shadow-md hover:border-brand-cyan/40 transition ${
                      arrastrando === c.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium text-brand-navy leading-tight">
                        {c.inmobiliaria}
                      </p>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => derivarACliente(e, c)}
                          title={
                            convertidos.has(c.id)
                              ? "Ya es cliente (Pruebas / Alianzas)"
                              : "Derivar a Pruebas / Alianzas"
                          }
                          className={
                            convertidos.has(c.id)
                              ? "text-green-600"
                              : "text-brand-gray hover:text-brand-navy"
                          }
                        >
                          <IconUserPlus width={14} height={14} />
                        </button>
                        <button
                          onClick={(e) => eliminarRapido(e, c.id)}
                          title="Sacar del pipeline (no borra el contacto)"
                          className="text-brand-gray hover:text-red-600"
                        >
                          <IconTrash width={14} height={14} />
                        </button>
                      </span>
                    </div>
                    {c.barrio && <p className="text-xs text-brand-gray mt-0.5">{c.barrio}</p>}
                    <div className="mt-1.5">
                      <ContactoRowIcons
                        telefono={c.telefono}
                        email={c.email}
                        instagram={c.instagram}
                        web={c.web}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <button
          onClick={agregarEtapa}
          className="shrink-0 w-40 h-fit rounded-xl border border-dashed text-sm text-brand-gray hover:text-brand-navy hover:border-brand-navy px-3 py-2.5 flex items-center justify-center gap-1.5"
        >
          <Plus size={14} /> Agregar columna
        </button>
      </div>

      {contactoAbierto && (
        <ContactoModal
          contacto={contactoAbierto}
          etapas={etapas}
          onClose={() => setContactoAbierto(null)}
          onChanged={() => {
            setContactoAbierto(null);
            cargar();
          }}
          mostrarFunnel={true}
          mostrarArchivar={false}
        />
      )}
    </div>
  );
}
