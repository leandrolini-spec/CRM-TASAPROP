"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconTrash, IconArchive } from "@/components/icons";

export type Contacto = {
  id: string;
  inmobiliaria: string;
  barrio: string | null;
  telefono: string | null;
  email: string | null;
  instagram: string | null;
  web: string | null;
  fuente: string | null;
  notas: string | null;
  estado: string;
  archivado: boolean;
  correo_enviado: boolean;
  respondio: boolean;
  interesado: boolean | null;
  reunion: boolean;
  baja: boolean;
};

export default function ContactoModal({
  contacto,
  etapas,
  onClose,
  onChanged,
  mostrarFunnel,
  mostrarArchivar,
}: {
  contacto: Contacto;
  etapas?: { nombre: string }[];
  onClose: () => void;
  onChanged: () => void;
  mostrarFunnel: boolean;
  mostrarArchivar: boolean;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    inmobiliaria: contacto.inmobiliaria,
    barrio: contacto.barrio ?? "",
    telefono: contacto.telefono ?? "",
    email: contacto.email ?? "",
    instagram: contacto.instagram ?? "",
    web: contacto.web ?? "",
    fuente: contacto.fuente ?? "",
    notas: contacto.notas ?? "",
    estado: contacto.estado,
    correo_enviado: contacto.correo_enviado,
    respondio: contacto.respondio,
    reunion: contacto.reunion,
    baja: contacto.baja,
  });
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await supabase
      .from("contactos")
      .update({
        inmobiliaria: form.inmobiliaria,
        barrio: form.barrio || null,
        telefono: form.telefono || null,
        email: form.email || null,
        instagram: form.instagram || null,
        web: form.web || null,
        fuente: form.fuente || null,
        notas: form.notas || null,
        ...(mostrarFunnel
          ? {
              estado: form.estado,
              correo_enviado: form.correo_enviado,
              respondio: form.respondio,
              reunion: form.reunion,
              baja: form.baja,
            }
          : {}),
      })
      .eq("id", contacto.id);
    if (form.email) {
      fetch("/api/brevo/sync-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          inmobiliaria: form.inmobiliaria,
          barrio: form.barrio || null,
          telefono: form.telefono || null,
        }),
      }).catch(() => {});
    }
    setGuardando(false);
    onChanged();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este contacto definitivamente? No se puede deshacer.")) return;
    await supabase.from("contactos").delete().eq("id", contacto.id);
    onChanged();
  }

  async function archivar() {
    await supabase.from("contactos").update({ archivado: true }).eq("id", contacto.id);
    onChanged();
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-[#17184B]">Contacto</h3>
          <button
            onClick={onClose}
            className="text-[#72767B] hover:text-[#17184B] text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={guardar} className="p-5 space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Inmobiliaria *"
            value={form.inmobiliaria}
            onChange={(e) => setForm({ ...form, inmobiliaria: e.target.value })}
            required
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Localidad"
            value={form.barrio}
            onChange={(e) => setForm({ ...form, barrio: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Teléfono/WhatsApp"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Instagram (@usuario)"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Web"
              value={form.web}
              onChange={(e) => setForm({ ...form, web: e.target.value })}
            />
          </div>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Fuente"
            value={form.fuente}
            onChange={(e) => setForm({ ...form, fuente: e.target.value })}
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Notas"
            rows={3}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />

          {mostrarFunnel && (
            <div className="border-t pt-3 space-y-3">
              <div>
                <label className="block text-xs text-[#72767B] mb-1">Estado</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  {(etapas ?? []).map((etapa) => (
                    <option key={etapa.nombre} value={etapa.nombre}>
                      {etapa.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-[#202124]">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={form.correo_enviado}
                    onChange={(e) => setForm({ ...form, correo_enviado: e.target.checked })}
                  />
                  Enviado
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={form.respondio}
                    onChange={(e) => setForm({ ...form, respondio: e.target.checked })}
                  />
                  Respondió
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={form.reunion}
                    onChange={(e) => setForm({ ...form, reunion: e.target.checked })}
                  />
                  Reunión
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={form.baja}
                    onChange={(e) => setForm({ ...form, baja: e.target.checked })}
                  />
                  Baja
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={eliminar}
                title="Eliminar"
                className="text-red-600 hover:text-red-700"
              >
                <IconTrash width={18} height={18} />
              </button>
              {mostrarArchivar && (
                <button
                  type="button"
                  onClick={archivar}
                  title="Archivar"
                  className="text-[#72767B] hover:text-[#17184B]"
                >
                  <IconArchive width={18} height={18} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-[#17184B] text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
