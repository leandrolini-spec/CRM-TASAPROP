"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Send, MessageSquareText, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatFechaCorta } from "@/lib/date";

type UsuarioApp = {
  id: string;
  nombre: string | null;
  email: string;
  contactado: boolean;
  notas: string | null;
  created_at: string;
  encuesta_enviada_at: string | null;
  encuesta_respondida_at: string | null;
  baja: boolean;
  prueba_activada_at: string | null;
  prueba_vence_at: string | null;
};

export default function UsuariosClient({ initial }: { initial: UsuarioApp[] }) {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState<UsuarioApp[]>(initial);
  const [filtro, setFiltro] = useState("");
  const [verContactados, setVerContactados] = useState<"" | "si" | "no">("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  async function toggleContactado(u: UsuarioApp) {
    const valor = !u.contactado;
    setUsuarios((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, contactado: valor } : x))
    );
    const { error } = await supabase
      .from("usuarios_app")
      .update({ contactado: valor })
      .eq("id", u.id);
    if (error) {
      alert("No se pudo guardar el cambio: " + error.message);
      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, contactado: !valor } : x))
      );
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

  async function enviarEncuesta() {
    if (seleccionados.size === 0) return;
    if (
      !confirm(
        `¿Mandar la encuesta a ${seleccionados.size} usuario${seleccionados.size === 1 ? "" : "s"} por mail?`
      )
    )
      return;
    setEnviando(true);
    try {
      const res = await fetch("/api/usuarios/encuesta/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...seleccionados] }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("No se pudo enviar: " + (data.error ?? "error desconocido"));
        return;
      }
      const ahora = new Date().toISOString();
      setUsuarios((prev) =>
        prev.map((u) =>
          seleccionados.has(u.id) ? { ...u, encuesta_enviada_at: ahora } : u
        )
      );
      setSeleccionados(new Set());
      let mensaje = `Se mandó la encuesta a ${data.enviados} usuario${data.enviados === 1 ? "" : "s"}.`;
      if (data.fallidos?.length) {
        mensaje += ` ${data.fallidos.length} fallaron: ${data.fallidos.map((f: { email: string }) => f.email).join(", ")}`;
      }
      alert(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  async function activarPrueba(u: UsuarioApp) {
    const diasTexto = prompt(
      `¿Cuántos días de prueba gratis le activamos a ${u.nombre ?? u.email}?`,
      "7"
    );
    if (diasTexto === null) return;
    const dias = Number(diasTexto);
    if (!Number.isFinite(dias) || dias <= 0) {
      alert("Cantidad de días inválida.");
      return;
    }
    const res = await fetch("/api/prueba-gratis/activar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "usuario", id: u.id, dias }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert("No se pudo activar la prueba: " + (data.error ?? "error desconocido"));
      return;
    }
    setUsuarios((prev) =>
      prev.map((x) =>
        x.id === u.id
          ? { ...x, prueba_activada_at: new Date().toISOString(), prueba_vence_at: data.venceAt }
          : x
      )
    );
    if (data.mailError) {
      alert("Prueba activada, pero " + data.mailError);
    }
  }

  const contactados = usuarios.filter((u) => u.contactado).length;
  const respondieron = usuarios.filter((u) => u.encuesta_respondida_at).length;

  const visibles = usuarios.filter((u) => {
    if (verContactados === "si" && !u.contactado) return false;
    if (verContactados === "no" && u.contactado) return false;
    if (filtro) {
      const q = filtro.toLowerCase();
      const enNombre = (u.nombre ?? "").toLowerCase().includes(q);
      const enEmail = u.email.toLowerCase().includes(q);
      if (!enNombre && !enEmail) return false;
    }
    return true;
  });

  const idsVisibles = visibles.map((u) => u.id);
  const todosVisiblesSeleccionados =
    idsVisibles.length > 0 && idsVisibles.every((id) => seleccionados.has(id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Usuarios</h1>
          <p className="text-sm text-brand-gray">
            Todas las cuentas registradas en la app de TasaProp —{" "}
            {usuarios.length} en total, {contactados} contactados,{" "}
            {respondieron} respondieron la encuesta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/usuarios/respuestas"
            className="inline-flex items-center gap-1.5 rounded-lg border text-sm font-medium px-3 py-2 text-brand-navy hover:bg-gray-50"
          >
            <MessageSquareText size={15} />
            Ver respuestas ({respondieron})
          </Link>
          <a
            href="/api/usuarios/export"
            className="rounded-lg border text-sm font-medium px-3 py-2 text-brand-navy hover:bg-gray-50"
          >
            Exportar Excel
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-brand-gray mb-1">Buscar</label>
          <input
            className="border rounded-lg px-3 py-2 text-sm w-64"
            placeholder="Nombre o email..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-brand-gray mb-1">Contactado</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={verContactados}
            onChange={(e) => setVerContactados(e.target.value as "" | "si" | "no")}
          >
            <option value="">Todos</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      {seleccionados.size > 0 && (
        <div className="bg-brand-navy rounded-xl p-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-white">
            {seleccionados.size} seleccionado{seleccionados.size === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={enviarEncuesta}
              disabled={enviando}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white text-brand-navy text-sm font-medium px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
            >
              <Send size={14} />
              {enviando ? "Enviando..." : "Enviar encuesta"}
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
                  checked={todosVisiblesSeleccionados}
                  onChange={(e) => {
                    setSeleccionados((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) idsVisibles.forEach((id) => next.add(id));
                      else idsVisibles.forEach((id) => next.delete(id));
                      return next;
                    });
                  }}
                  title="Seleccionar todos (para mandar la encuesta)"
                />
              </th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Encuesta</th>
              <th className="px-3 py-2">Prueba gratis</th>
              <th className="px-3 py-2">Contactado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-brand-gray">
                  Sin usuarios que coincidan.
                </td>
              </tr>
            )}
            {visibles.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(u.id)}
                    onChange={() => toggleSeleccion(u.id)}
                  />
                </td>
                <td className="px-3 py-2 font-medium">{u.nombre ?? "-"}</td>
                <td className="px-3 py-2 text-brand-gray">{u.email}</td>
                <td className="px-3 py-2 text-xs">
                  {u.encuesta_respondida_at ? (
                    <span className="text-green-700 font-medium">
                      Respondió {formatFechaCorta(u.encuesta_respondida_at.slice(0, 10))}
                    </span>
                  ) : u.encuesta_enviada_at ? (
                    <span className="text-brand-gray">
                      Enviada {formatFechaCorta(u.encuesta_enviada_at.slice(0, 10))}
                    </span>
                  ) : (
                    <span className="text-gray-300">Sin enviar</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {u.prueba_vence_at ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          new Date(u.prueba_vence_at) > new Date()
                            ? "text-green-700 font-medium"
                            : "text-brand-gray"
                        }
                      >
                        {new Date(u.prueba_vence_at) > new Date() ? "Activa hasta" : "Venció"}{" "}
                        {formatFechaCorta(u.prueba_vence_at.slice(0, 10))}
                      </span>
                      <button
                        onClick={() => activarPrueba(u)}
                        title="Reactivar / renovar prueba"
                        className="text-brand-gray hover:text-brand-navy"
                      >
                        <Gift size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => activarPrueba(u)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 text-brand-gray hover:bg-brand-cyan/15 hover:text-brand-navy transition"
                    >
                      <Gift size={14} />
                      Activar prueba
                    </button>
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleContactado(u)}
                    title={
                      u.contactado
                        ? "Contactado — tocá para marcar pendiente"
                        : "Marcar como contactado"
                    }
                    className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition ${
                      u.contactado
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    }`}
                  >
                    {u.contactado ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {u.contactado ? "Contactado" : "Pendiente"}
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
