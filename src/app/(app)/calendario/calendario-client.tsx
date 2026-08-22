"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Evento = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora: string | null;
  contacto_id: string | null;
  cliente_id: string | null;
  contactos: { inmobiliaria: string } | null;
  clientes: { nombre: string } | null;
};

type Opcion = { id: string; inmobiliaria?: string; nombre?: string };

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function buildGrid(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  // Lunes = 0 ... Domingo = 6
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function CalendarioClient({
  initial,
  contactos,
  clientes,
}: {
  initial: Evento[];
  contactos: Opcion[];
  clientes: Opcion[];
}) {
  const supabase = createClient();
  const [eventos, setEventos] = useState<Evento[]>(initial);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({
    titulo: "",
    hora: "",
    descripcion: "",
    contacto_id: "",
    cliente_id: "",
  });
  const [guardando, setGuardando] = useState(false);

  const vacio = { titulo: "", hora: "", descripcion: "", contacto_id: "", cliente_id: "" };

  function abrirDia(iso: string) {
    setDiaSeleccionado(iso);
    setEditandoId(null);
    setNuevo(vacio);
  }

  function editarEvento(e: Evento) {
    setEditandoId(e.id);
    setNuevo({
      titulo: e.titulo,
      hora: e.hora ? e.hora.slice(0, 5) : "",
      descripcion: e.descripcion ?? "",
      contacto_id: e.contacto_id ?? "",
      cliente_id: e.cliente_id ?? "",
    });
  }

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("eventos")
      .select("*, contactos(inmobiliaria), clientes(nombre)")
      .order("fecha", { ascending: true });
    setEventos((data as Evento[]) ?? []);
  }, [supabase]);

  const eventosPorDia = useMemo(() => {
    const m = new Map<string, Evento[]>();
    for (const e of eventos) {
      const lista = m.get(e.fecha) ?? [];
      lista.push(e);
      m.set(e.fecha, lista);
    }
    return m;
  }, [eventos]);

  const dias = useMemo(() => buildGrid(viewDate), [viewDate]);
  const hoyISO = toISODate(new Date());
  const mesActual = viewDate.getMonth();

  async function guardarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.titulo.trim() || !diaSeleccionado) return;
    setGuardando(true);
    const payload = {
      titulo: nuevo.titulo,
      fecha: diaSeleccionado,
      hora: nuevo.hora || null,
      descripcion: nuevo.descripcion || null,
      contacto_id: nuevo.contacto_id || null,
      cliente_id: nuevo.cliente_id || null,
    };
    if (editandoId) {
      await supabase.from("eventos").update(payload).eq("id", editandoId);
    } else {
      await supabase.from("eventos").insert(payload);
    }
    setEditandoId(null);
    setNuevo(vacio);
    setGuardando(false);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este evento?")) return;
    setEventos((prev) => prev.filter((e) => e.id !== id));
    if (editandoId === id) {
      setEditandoId(null);
      setNuevo(vacio);
    }
    await supabase.from("eventos").delete().eq("id", id);
  }

  const eventosDelDiaSeleccionado = diaSeleccionado
    ? eventosPorDia.get(diaSeleccionado) ?? []
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Calendario</h1>
        <p className="text-sm text-brand-gray">
          Reuniones y recordatorios internos del equipo.
        </p>
      </div>

      <Card className="overflow-hidden !border-brand-navy/25">
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-navy/25">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
              }
              className="w-8 h-8 rounded-lg border hover:bg-gray-50 text-brand-navy flex items-center justify-center"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() =>
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
              }
              className="w-8 h-8 rounded-lg border hover:bg-gray-50 text-brand-navy flex items-center justify-center"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
            <h2 className="ml-2 text-lg font-semibold text-brand-navy">
              {MESES[viewDate.getMonth()]} {String(viewDate.getFullYear()).slice(-2)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewDate(new Date())}
              className="px-3 py-1.5 rounded-lg border text-sm text-brand-navy hover:bg-gray-50"
            >
              Hoy
            </button>
            <Button onClick={() => abrirDia(hoyISO)} className="px-3 py-1.5">
              + Nuevo evento
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-medium text-brand-gray border-b border-brand-navy/25">
          {DIAS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-l border-t border-brand-navy/25">
          {dias.map((d, i) => {
            const iso = toISODate(d);
            const esDelMes = d.getMonth() === mesActual;
            const esHoy = iso === hoyISO;
            const eventosDia = eventosPorDia.get(iso) ?? [];
            const esPrimeraDeUltimaFila = i === dias.length - 7;
            const esUltimaDeUltimaFila = i === dias.length - 1;
            const redondeo = esPrimeraDeUltimaFila
              ? "rounded-bl-xl"
              : esUltimaDeUltimaFila
                ? "rounded-br-xl"
                : "";
            return (
              <button
                key={iso}
                onClick={() => abrirDia(iso)}
                className={`min-h-[92px] border-b border-r border-brand-navy/25 p-1.5 text-left align-top transition ${redondeo} ${
                  esHoy
                    ? "bg-brand-cyan/10 hover:bg-brand-cyan/15"
                    : esDelMes
                      ? "bg-white hover:bg-gray-50"
                      : "bg-gray-50/50 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                    esHoy
                      ? "bg-brand-navy text-white font-semibold"
                      : esDelMes
                        ? "text-brand-ink"
                        : "text-brand-gray"
                  }`}
                >
                  {d.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {eventosDia.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className="truncate text-[11px] px-1.5 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy font-medium"
                    >
                      {e.hora ? `${e.hora.slice(0, 5)} ` : ""}
                      {e.titulo}
                    </div>
                  ))}
                  {eventosDia.length > 3 && (
                    <div className="text-[11px] text-brand-gray px-1.5">
                      +{eventosDia.length - 3} más
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {diaSeleccionado && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
          onClick={() => setDiaSeleccionado(null)}
        >
          <Card
            shadow
            className="max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-brand-navy">
                {new Date(diaSeleccionado + "T00:00:00").toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              <button
                onClick={() => setDiaSeleccionado(null)}
                className="text-brand-gray hover:text-brand-navy"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {eventosDelDiaSeleccionado.length > 0 && (
              <div className="divide-y border-b">
                {eventosDelDiaSeleccionado.map((e) => (
                  <div key={e.id} className="flex items-start justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium text-brand-navy">
                        {e.hora ? `${e.hora.slice(0, 5)} · ` : ""}
                        {e.titulo}
                      </p>
                      {(e.contactos || e.clientes || e.descripcion) && (
                        <p className="text-brand-gray mt-0.5">
                          {e.contactos?.inmobiliaria}
                          {e.contactos && e.clientes ? " · " : ""}
                          {e.clientes?.nombre}
                          {(e.contactos || e.clientes) && e.descripcion ? " · " : ""}
                          {e.descripcion}
                        </p>
                      )}
                    </div>
                    <span className="flex items-center gap-3 shrink-0 ml-3">
                      <button
                        onClick={() => editarEvento(e)}
                        className="text-xs text-brand-gray hover:text-brand-navy inline-flex items-center gap-1"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        onClick={() => eliminar(e.id)}
                        className="text-xs text-brand-gray hover:text-red-600"
                      >
                        Eliminar
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={guardarEvento} className="p-5 space-y-3">
              {editandoId && (
                <p className="text-xs text-brand-gray -mt-1">
                  Editando evento existente.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoId(null);
                      setNuevo(vacio);
                    }}
                    className="text-brand-navy underline"
                  >
                    Cancelar edición
                  </button>
                </p>
              )}
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                placeholder="Título *"
                value={nuevo.titulo}
                onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })}
                required
                autoFocus
              />
              <input
                type="time"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                value={nuevo.hora}
                onChange={(e) => setNuevo({ ...nuevo, hora: e.target.value })}
              />
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                value={nuevo.contacto_id}
                onChange={(e) => setNuevo({ ...nuevo, contacto_id: e.target.value })}
              >
                <option value="">Sin contacto vinculado</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.inmobiliaria}
                  </option>
                ))}
              </select>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                value={nuevo.cliente_id}
                onChange={(e) => setNuevo({ ...nuevo, cliente_id: e.target.value })}
              >
                <option value="">Sin cliente vinculado</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                placeholder="Notas"
                value={nuevo.descripcion}
                onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
              />
              <Button type="submit" disabled={guardando} className="w-full py-2">
                {guardando
                  ? "Guardando..."
                  : editandoId
                    ? "Guardar cambios"
                    : "+ Agregar evento"}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
