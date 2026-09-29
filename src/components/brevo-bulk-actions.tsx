"use client";

import { useEffect, useState } from "react";

type Template = { id: number; name: string; subject: string };
type Lista = { id: number; name: string; totalSubscribers: number };

export default function BrevoBulkActions({
  selectedIds,
  onDone,
  onEmailsEnListaChange,
}: {
  selectedIds: string[];
  onDone: () => void;
  onEmailsEnListaChange?: (emails: Set<string> | null) => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [listaId, setListaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [enviandoEncuesta, setEnviandoEncuesta] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brevo/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch(() => {});
    fetch("/api/brevo/lists")
      .then((r) => r.json())
      .then((data) => setListas(data.lists ?? []))
      .catch(() => {});
  }, []);

  function elegirLista(id: string) {
    setListaId(id);
    if (!onEmailsEnListaChange) return;
    if (!id) {
      onEmailsEnListaChange(null);
      return;
    }
    fetch(`/api/brevo/list-members?listId=${id}`)
      .then((r) => r.json())
      .then((data) => onEmailsEnListaChange(new Set<string>(data.emails ?? [])))
      .catch(() => onEmailsEnListaChange(null));
  }

  async function enviarPlantilla() {
    if (!templateId) return;
    setEnviando(true);
    setMensaje(null);
    setError(null);
    const res = await fetch("/api/brevo/send-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: selectedIds, templateId: Number(templateId) }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar");
      return;
    }
    setMensaje(
      `Enviado a ${data.enviados} contacto(s).` +
        (data.fallidos ? ` ${data.fallidos} fallaron.` : "") +
        (data.sinEmail ? ` ${data.sinEmail} sin email, se omitieron.` : "")
    );
    onDone();
  }

  async function agregarALista() {
    if (!listaId) return;
    setAgregando(true);
    setMensaje(null);
    setError(null);
    const res = await fetch("/api/brevo/add-to-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: selectedIds, listId: Number(listaId) }),
    });
    const data = await res.json();
    setAgregando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo agregar a la lista");
      return;
    }
    setMensaje(
      `Agregados ${data.agregados} contacto(s) a la lista.` +
        (data.sinEmail ? ` ${data.sinEmail} sin email, se omitieron.` : "")
    );
    onDone();
  }

  async function enviarEncuesta() {
    if (
      !confirm(
        `¿Enviar la encuesta de retención a ${selectedIds.length} contacto(s)? Esto les manda un mail ahora mismo.`
      )
    )
      return;
    setEnviandoEncuesta(true);
    setMensaje(null);
    setError(null);
    const res = await fetch("/api/contactos/encuesta/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    const data = await res.json();
    setEnviandoEncuesta(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar la encuesta");
      return;
    }
    setMensaje(
      `Encuesta enviada a ${data.enviados} contacto(s).` +
        (data.fallidos?.length ? ` ${data.fallidos.length} fallaron.` : "")
    );
    onDone();
  }

  const inputClass =
    "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-[#17184B] min-w-[180px]";

  return (
    <div className="bg-[#17184B] rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-white">
        {selectedIds.length} contacto{selectedIds.length === 1 ? "" : "s"} seleccionado
        {selectedIds.length === 1 ? "" : "s"} — elegí una acción de Brevo para aplicarles:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/10 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-white/90 uppercase tracking-wide">
            Encuesta de retención
          </p>
          <p className="text-xs text-white/70">
            La misma que ya se envió a Usuarios App.
          </p>
          <button
            onClick={enviarEncuesta}
            disabled={enviandoEncuesta}
            className="shrink-0 rounded-lg bg-white text-[#17184B] text-sm font-medium px-3 py-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {enviandoEncuesta ? "Enviando..." : "Enviar encuesta"}
          </button>
        </div>

        <div className="bg-white/10 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-white/90 uppercase tracking-wide">
            Enviar una plantilla ya armada
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={inputClass}
            >
              <option value="">
                {templates.length === 0 ? "Sin plantillas en Brevo" : "Elegir plantilla..."}
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={enviarPlantilla}
              disabled={!templateId || enviando}
              className="shrink-0 rounded-lg bg-white text-[#17184B] text-sm font-medium px-3 py-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>

        <div className="bg-white/10 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-white/90 uppercase tracking-wide">
            Agregar a una lista de difusión
          </p>
          {listaId && (
            <p className="text-xs text-white/70">
              Los contactos que ya están en esta lista se marcan con &quot;✓ en lista&quot; abajo.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={listaId}
              onChange={(e) => elegirLista(e.target.value)}
              className={inputClass}
            >
              <option value="">
                {listas.length === 0 ? "Sin listas en Brevo" : "Elegir lista..."}
              </option>
              {listas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.totalSubscribers})
                </option>
              ))}
            </select>
            <button
              onClick={agregarALista}
              disabled={!listaId || agregando}
              className="shrink-0 rounded-lg border border-white text-white text-sm font-medium px-3 py-1.5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {agregando ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </div>
      </div>

      {(mensaje || error) && (
        <p className={`text-xs ${error ? "text-red-200" : "text-white/90"}`}>
          {error ? `Error: ${error}` : mensaje}
        </p>
      )}
    </div>
  );
}
