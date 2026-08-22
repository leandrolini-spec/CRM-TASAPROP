"use client";

import { useState } from "react";
import { RefreshCw, ChevronDown, Check } from "lucide-react";

type Destinatario = {
  email: string;
  inmobiliaria: string | null;
  enviado: boolean;
  entregado: boolean;
  abierto: boolean;
  fechaApertura: string | null;
  vecesAbierto: number;
};

type GlobalStats = {
  sent: number;
  delivered: number;
  softBounces: number;
  hardBounces: number;
  uniqueViews: number;
  opensRate: number;
  uniqueClicks: number;
  unsubscriptions: number;
  complaints: number;
};

export type CampanaBrevo = {
  id: number;
  name: string;
  subject: string;
  status: string;
  sentDate: string | null;
  scheduledAt: string | null;
  createdAt: string;
  statistics?: { globalStats: GlobalStats };
};

const ESTADO_LABEL: Record<string, string> = {
  sent: "Enviada",
  queued: "En cola",
  inProcess: "Enviando",
  draft: "Borrador",
  inReview: "En revisión",
  suspended: "Suspendida",
  cancelling: "Cancelando",
  cancelled: "Cancelada",
  archive: "Archivada",
};

const ESTADO_COLOR: Record<string, string> = {
  sent: "bg-green-100 text-green-700",
  queued: "bg-blue-100 text-blue-700",
  inProcess: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
  inReview: "bg-yellow-100 text-yellow-700",
  suspended: "bg-red-100 text-red-700",
  cancelling: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  archive: "bg-gray-100 text-gray-600",
};

function fmtFecha(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function pct(n: number, total: number) {
  if (!total) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

export default function CampanasClient({
  initial,
  initialError,
}: {
  initial: CampanaBrevo[];
  initialError: string | null;
}) {
  const [campanas, setCampanas] = useState(initial);
  const [error, setError] = useState(initialError);
  const [actualizando, setActualizando] = useState(false);
  const [abiertoId, setAbiertoId] = useState<number | null>(null);
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [cargandoDestinatarios, setCargandoDestinatarios] = useState(false);
  const [errorDestinatarios, setErrorDestinatarios] = useState<string | null>(null);

  async function verAperturas(id: number) {
    if (abiertoId === id) {
      setAbiertoId(null);
      return;
    }
    setAbiertoId(id);
    setDestinatarios([]);
    setErrorDestinatarios(null);
    setCargandoDestinatarios(true);
    try {
      const res = await fetch(`/api/brevo/campaigns/${id}/aperturas`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al consultar Brevo");
      setDestinatarios(data.recipients ?? []);
    } catch (err) {
      setErrorDestinatarios(err instanceof Error ? err.message : String(err));
    } finally {
      setCargandoDestinatarios(false);
    }
  }

  async function actualizar() {
    setActualizando(true);
    setError(null);
    try {
      const res = await fetch("/api/brevo/campaigns");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al consultar Brevo");
      setCampanas(data.campaigns ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActualizando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Campañas de email</h1>
          <p className="text-sm text-brand-gray">
            Estadísticas en vivo desde Brevo — mismos números que ves en su
            panel.
          </p>
        </div>
        <button
          onClick={actualizar}
          disabled={actualizando}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-brand-navy hover:bg-gray-50 disabled:opacity-50 shrink-0 flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={actualizando ? "animate-spin" : ""} />
          {actualizando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          No se pudo consultar Brevo: {error}
        </div>
      )}

      {campanas.length === 0 && !error && (
        <div className="bg-white rounded-xl border px-4 py-6 text-center text-sm text-brand-gray">
          Todavía no hay campañas en Brevo.
        </div>
      )}

      <div className="space-y-4">
        {campanas.map((c) => {
          const s = c.statistics?.globalStats;
          return (
            <div key={c.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h3 className="font-semibold text-brand-navy">{c.name}</h3>
                  <p className="text-xs text-brand-gray mt-0.5">{c.subject}</p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                    ESTADO_COLOR[c.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ESTADO_LABEL[c.status] ?? c.status}
                </span>
              </div>
              <p className="text-xs text-brand-gray mb-4">
                Enviada el {fmtFecha(c.sentDate)}
              </p>

              {s ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  <Stat label="Enviados" value={s.sent} />
                  <Stat
                    label="Entregados"
                    value={s.delivered}
                    sub={pct(s.delivered, s.sent)}
                  />
                  <Stat
                    label="Aperturas"
                    value={s.uniqueViews}
                    sub={`${s.opensRate.toFixed(1)}%`}
                  />
                  <Stat
                    label="Clicks"
                    value={s.uniqueClicks}
                    sub={pct(s.uniqueClicks, s.delivered)}
                  />
                  <Stat
                    label="Rebotes"
                    value={s.softBounces + s.hardBounces}
                    sub={pct(s.softBounces + s.hardBounces, s.sent)}
                  />
                  <Stat label="Bajas" value={s.unsubscriptions} />
                </div>
              ) : (
                <p className="text-sm text-brand-gray">Sin estadísticas todavía.</p>
              )}

              {c.status === "sent" && (
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => verAperturas(c.id)}
                    className="text-sm font-medium text-brand-navy hover:underline inline-flex items-center gap-1"
                  >
                    {abiertoId === c.id ? "Ocultar" : "Ver quién abrió"}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${abiertoId === c.id ? "rotate-180" : ""}`}
                    />
                  </button>

                  {abiertoId === c.id && (
                    <div className="mt-3">
                      {cargandoDestinatarios && (
                        <p className="text-sm text-brand-gray">Consultando Brevo...</p>
                      )}
                      {errorDestinatarios && (
                        <p className="text-sm text-red-600">{errorDestinatarios}</p>
                      )}
                      {!cargandoDestinatarios && !errorDestinatarios && (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-brand-gray border-b bg-gray-50">
                                <th className="px-3 py-2">Inmobiliaria</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Entregado</th>
                                <th className="px-3 py-2">Abrió</th>
                                <th className="px-3 py-2">Cuándo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {destinatarios.map((d) => (
                                <tr key={d.email} className="border-b last:border-0">
                                  <td className="px-3 py-2 font-medium">
                                    {d.inmobiliaria ?? "-"}
                                  </td>
                                  <td className="px-3 py-2 text-brand-gray">{d.email}</td>
                                  <td className="px-3 py-2">
                                    {d.entregado ? (
                                      <Check size={14} className="text-green-600" />
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    {d.abierto ? (
                                      <span className="text-green-700 font-medium inline-flex items-center gap-1">
                                        <Check size={14} />{" "}
                                        {d.vecesAbierto > 1 ? `(${d.vecesAbierto}x)` : ""}
                                      </span>
                                    ) : (
                                      <span className="text-brand-gray">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-brand-gray">
                                    {d.fechaApertura
                                      ? new Date(d.fechaApertura).toLocaleString("es-AR", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-brand-gray">{label}</p>
      <p className="text-lg font-bold text-brand-navy">
        {value.toLocaleString("es-AR")}
        {sub && <span className="text-xs font-normal text-brand-gray ml-1">{sub}</span>}
      </p>
    </div>
  );
}
