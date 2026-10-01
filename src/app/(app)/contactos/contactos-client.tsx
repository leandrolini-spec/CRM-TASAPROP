"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import ContactoModal, { type Contacto } from "@/components/contacto-modal";
import ContactoRowIcons from "@/components/contacto-row-icons";
import ImportExportButtons from "@/components/import-export-buttons";
import BrevoBulkActions from "@/components/brevo-bulk-actions";
import BrevoListCheck from "@/components/brevo-list-check";
import ResyncBrevoButton from "@/components/resync-brevo-button";
import { IconTrash, IconArchive, IconUserPlus } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Check, MessageSquareText, Gift } from "lucide-react";
import Link from "next/link";
import { formatFechaCorta } from "@/lib/date";

export default function ContactosClient({
  initial,
  derivados,
}: {
  initial: Contacto[];
  derivados: string[];
}) {
  const supabase = createClient();
  const [contactos, setContactos] = useState<Contacto[]>(initial);
  const [convertidos, setConvertidos] = useState<Set<string>>(new Set(derivados));
  const [filtroBarrio, setFiltroBarrio] = useState("");
  const [filtroInmobiliaria, setFiltroInmobiliaria] = useState("");
  const [verArchivados, setVerArchivados] = useState(false);
  const [verIncompletos, setVerIncompletos] = useState(false);
  const [orden, setOrden] = useState<"" | "alfabetico" | "barrio">("");
  const [contactoAbierto, setContactoAbierto] = useState<Contacto | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [emailsEnLista, setEmailsEnLista] = useState<Set<string> | null>(null);
  const [nuevo, setNuevo] = useState({
    inmobiliaria: "",
    barrio: "",
    email: "",
    telefono: "",
    instagram: "",
    web: "",
    fuente: "",
    notas: "",
  });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("contactos")
      .select("*")
      .order("created_at", { ascending: false });
    setContactos((data as Contacto[]) ?? []);
  }, [supabase]);

  async function agregarContacto(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.inmobiliaria.trim()) return;
    setGuardando(true);
    await supabase.from("contactos").insert({
      inmobiliaria: nuevo.inmobiliaria,
      barrio: nuevo.barrio || null,
      email: nuevo.email || null,
      telefono: nuevo.telefono || null,
      instagram: nuevo.instagram || null,
      web: nuevo.web || null,
      fuente: nuevo.fuente || null,
      notas: nuevo.notas || null,
    });
    if (nuevo.email) {
      fetch("/api/brevo/sync-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: nuevo.email,
          inmobiliaria: nuevo.inmobiliaria,
          barrio: nuevo.barrio || null,
          telefono: nuevo.telefono || null,
        }),
      }).catch(() => {});
    }
    setNuevo({
      inmobiliaria: "",
      barrio: "",
      email: "",
      telefono: "",
      instagram: "",
      web: "",
      fuente: "",
      notas: "",
    });
    setGuardando(false);
    cargar();
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
      notas: `Derivado desde Contactos${contacto.barrio ? ` (${contacto.barrio})` : ""}`,
    });
  }

  async function archivarRapido(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await supabase.from("contactos").update({ archivado: true }).eq("id", id);
    cargar();
  }

  async function desarchivarRapido(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await supabase.from("contactos").update({ archivado: false }).eq("id", id);
    cargar();
  }

  async function eliminarRapido(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("¿Eliminar este contacto definitivamente? No se puede deshacer.")) return;
    await supabase.from("contactos").delete().eq("id", id);
    cargar();
  }

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function activarPrueba(e: React.MouseEvent, c: Contacto) {
    e.stopPropagation();
    const diasTexto = prompt(
      `¿Cuántos días de prueba gratis le activamos a ${c.inmobiliaria}?`,
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
      body: JSON.stringify({ tipo: "contacto", id: c.id, dias }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert("No se pudo activar la prueba: " + (data.error ?? "error desconocido"));
      return;
    }
    setContactos((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? { ...x, prueba_activada_at: new Date().toISOString(), prueba_vence_at: data.venceAt }
          : x
      )
    );
    if (data.mailError) {
      alert("Prueba activada, pero " + data.mailError);
    }
  }

  const respondieronEncuesta = contactos.filter((c) => c.encuesta_respondida_at).length;
  const archivados = contactos.filter((c) => c.archivado);
  // "Completo" = tiene email y teléfono. Los incompletos no entran a la lista
  // activa por defecto (mismo criterio que se usa para decidir a quién se le
  // puede escribir/llamar); se pueden revisar aparte con el toggle de abajo.
  const esCompleto = (c: Contacto) => !!c.email && !!c.telefono;
  const incompletos = contactos.filter((c) => !c.archivado && !esCompleto(c));
  const visibles = contactos
    .filter((c) => {
      if (verArchivados) return c.archivado;
      if (c.archivado) return false;
      if (verIncompletos) return !esCompleto(c);
      return esCompleto(c);
    })
    .filter((c) => {
      if (filtroBarrio && !c.barrio?.toLowerCase().includes(filtroBarrio.toLowerCase()))
        return false;
      if (
        filtroInmobiliaria &&
        !c.inmobiliaria.toLowerCase().includes(filtroInmobiliaria.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (orden === "alfabetico") return a.inmobiliaria.localeCompare(b.inmobiliaria);
      if (orden === "barrio")
        return (a.barrio ?? "").localeCompare(b.barrio ?? "") || a.inmobiliaria.localeCompare(b.inmobiliaria);
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Contactos</h1>
          <p className="text-sm text-brand-gray">
            Agenda de inmobiliarias. El seguimiento comercial se maneja en Seguimiento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/usuarios/respuestas"
            className="inline-flex items-center gap-1.5 rounded-lg border text-sm font-medium px-3 py-2 text-brand-navy hover:bg-gray-50"
          >
            <MessageSquareText size={15} />
            Ver respuestas ({respondieronEncuesta})
          </Link>
          <ResyncBrevoButton />
          <ImportExportButtons entity="contactos" onImported={cargar} />
        </div>
      </div>

      <Card
        as="form"
        onSubmit={agregarContacto}
        className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          placeholder="Inmobiliaria *"
          value={nuevo.inmobiliaria}
          onChange={(e) => setNuevo({ ...nuevo, inmobiliaria: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          placeholder="Localidad"
          value={nuevo.barrio}
          onChange={(e) => setNuevo({ ...nuevo, barrio: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          placeholder="Fuente (ej. Búsqueda web)"
          value={nuevo.fuente}
          onChange={(e) => setNuevo({ ...nuevo, fuente: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          placeholder="Email"
          value={nuevo.email}
          onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          placeholder="Teléfono/WhatsApp"
          value={nuevo.telefono}
          onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          placeholder="Instagram (@usuario)"
          value={nuevo.instagram}
          onChange={(e) => setNuevo({ ...nuevo, instagram: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          placeholder="Web"
          value={nuevo.web}
          onChange={(e) => setNuevo({ ...nuevo, web: e.target.value })}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-3 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          placeholder="Notas"
          value={nuevo.notas}
          onChange={(e) => setNuevo({ ...nuevo, notas: e.target.value })}
        />
        <Button type="submit" disabled={guardando} className="md:col-span-4">
          {guardando ? "Agregando..." : "+ Agendar contacto"}
        </Button>
      </Card>

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
        <div>
          <label className="block text-xs text-brand-gray mb-1">Ordenar por</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            value={orden}
            onChange={(e) => setOrden(e.target.value as "" | "alfabetico" | "barrio")}
          >
            <option value="">Más recientes</option>
            <option value="alfabetico">Alfabético (A-Z)</option>
            <option value="barrio">Localidad</option>
          </select>
        </div>
        <BrevoListCheck onEmailsChange={setEmailsEnLista} />
        {archivados.length > 0 && (
          <button
            onClick={() => setVerArchivados((v) => !v)}
            className="text-sm text-brand-gray hover:text-brand-navy underline pb-2"
          >
            {verArchivados ? "Ver activos" : `Ver archivados (${archivados.length})`}
          </button>
        )}
        {!verArchivados && incompletos.length > 0 && (
          <button
            onClick={() => setVerIncompletos((v) => !v)}
            className="text-sm text-brand-gray hover:text-brand-navy underline pb-2"
            title="Contactos activos a los que les falta email o teléfono"
          >
            {verIncompletos ? "Ver completos" : `Ver incompletos (${incompletos.length})`}
          </button>
        )}
      </div>

      {seleccionados.size > 0 && (
        <BrevoBulkActions
          selectedIds={[...seleccionados]}
          onDone={() => setSeleccionados(new Set())}
          onEmailsEnListaChange={setEmailsEnLista}
        />
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b bg-gray-50/60">
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={visibles.length > 0 && visibles.every((c) => seleccionados.has(c.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSeleccionados(new Set(visibles.map((c) => c.id)));
                    } else {
                      setSeleccionados(new Set());
                    }
                  }}
                />
              </th>
              <th className="px-3 py-2">Inmobiliaria</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Encuesta</th>
              <th className="px-3 py-2">Prueba gratis</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-brand-gray">
                  Sin contactos.
                </td>
              </tr>
            )}
            {visibles.map((c) => (
              <tr
                key={c.id}
                onClick={() => setContactoAbierto(c)}
                className="border-b last:border-0 cursor-pointer hover:bg-brand-cyan/5"
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={seleccionados.has(c.id)}
                    onChange={() => toggleSeleccion(c.id)}
                  />
                </td>
                <td className="px-3 py-2 font-medium">
                  {c.inmobiliaria}
                  {c.barrio && (
                    <span className="ml-2 text-xs font-normal text-brand-gray">
                      {c.barrio}
                    </span>
                  )}
                  {emailsEnLista && c.email && emailsEnLista.has(c.email.toLowerCase()) && (
                    <Badge tone="green" className="ml-2">
                      <Check size={11} /> en lista
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <ContactoRowIcons
                    telefono={c.telefono}
                    email={c.email}
                    instagram={c.instagram}
                    web={c.web}
                  />
                </td>
                <td className="px-3 py-2">
                  {c.encuesta_respondida_at ? (
                    <Badge tone="green">Respondió</Badge>
                  ) : c.encuesta_enviada_at ? (
                    <Badge tone="gray">Enviada</Badge>
                  ) : (
                    <span className="text-xs text-brand-gray">Sin enviar</span>
                  )}
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  {c.prueba_vence_at ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs ${
                          new Date(c.prueba_vence_at) > new Date()
                            ? "text-green-700 font-medium"
                            : "text-brand-gray"
                        }`}
                      >
                        {new Date(c.prueba_vence_at) > new Date() ? "Activa hasta" : "Venció"}{" "}
                        {formatFechaCorta(c.prueba_vence_at.slice(0, 10))}
                      </span>
                      <button
                        onClick={(e) => activarPrueba(e, c)}
                        title="Reactivar / renovar prueba"
                        className="text-brand-gray hover:text-brand-navy"
                      >
                        <Gift size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => activarPrueba(e, c)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 text-brand-gray hover:bg-brand-cyan/15 hover:text-brand-navy transition"
                    >
                      <Gift size={14} />
                      Activar prueba
                    </button>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-3 justify-end w-full">
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
                      <IconUserPlus width={16} height={16} />
                    </button>
                    {c.archivado ? (
                      <button
                        onClick={(e) => desarchivarRapido(e, c.id)}
                        title="Restaurar a activos"
                        className="text-green-600 hover:text-green-700"
                      >
                        <IconArchive width={16} height={16} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => archivarRapido(e, c.id)}
                        title="Archivar"
                        className="text-brand-gray hover:text-brand-navy"
                      >
                        <IconArchive width={16} height={16} />
                      </button>
                    )}
                    <button
                      onClick={(e) => eliminarRapido(e, c.id)}
                      title="Eliminar"
                      className="text-brand-gray hover:text-red-600"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {contactoAbierto && (
        <ContactoModal
          contacto={contactoAbierto}
          onClose={() => setContactoAbierto(null)}
          onChanged={() => {
            setContactoAbierto(null);
            cargar();
          }}
          mostrarFunnel={false}
          mostrarArchivar={!contactoAbierto.archivado}
        />
      )}
    </div>
  );
}
