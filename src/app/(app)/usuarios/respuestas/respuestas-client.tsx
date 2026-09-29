"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { formatFechaCorta } from "@/lib/date";
import {
  textoFrecuencia,
  textoMotivo,
  textoPrecio,
  textoTasacion,
} from "@/lib/encuesta-opciones";

type Respuesta = {
  id: string;
  usuario_id: string | null;
  email: string;
  frecuencia_uso: string;
  motivo_abandono: string[];
  motivo_otro: string | null;
  percepcion_precio: string | null;
  precio_dispuesto: string | null;
  tasacion_precision: string | null;
  whatsapp: string | null;
  comentario: string | null;
  created_at: string;
  usuarios_app: { nombre: string | null } | null;
  contactos: { inmobiliaria: string | null } | null;
};

function nombreDe(r: Respuesta) {
  return r.usuarios_app?.nombre ?? r.contactos?.inmobiliaria ?? null;
}

export default function RespuestasClient({ initial }: { initial: Respuesta[] }) {
  const [abierta, setAbierta] = useState<Respuesta | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Respuestas de la encuesta</h1>
        <p className="text-sm text-brand-gray">
          {initial.length} respuesta{initial.length === 1 ? "" : "s"}. Tocá una
          fila para ver el detalle completo.
        </p>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Frecuencia</th>
              <th className="px-3 py-2">Motivo principal</th>
              <th className="px-3 py-2">WhatsApp</th>
              <th className="px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-brand-gray">
                  Todavía no hay respuestas.
                </td>
              </tr>
            )}
            {initial.map((r) => (
              <tr
                key={r.id}
                onClick={() => setAbierta(r)}
                className="border-b last:border-0 cursor-pointer hover:bg-gray-50"
              >
                <td className="px-3 py-2 font-medium">
                  {nombreDe(r) ?? "-"}
                </td>
                <td className="px-3 py-2 text-brand-gray">{r.email}</td>
                <td className="px-3 py-2">{textoFrecuencia(r.frecuencia_uso)}</td>
                <td className="px-3 py-2">
                  {r.motivo_abandono.map(textoMotivo).join(", ")}
                </td>
                <td className="px-3 py-2 text-brand-gray">{r.whatsapp ?? "-"}</td>
                <td className="px-3 py-2 text-brand-gray whitespace-nowrap">
                  {formatFechaCorta(r.created_at.slice(0, 10))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abierta && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
          onClick={() => setAbierta(null)}
        >
          <div
            className="bg-white rounded-xl border max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-brand-navy">
                {nombreDe(abierta) ?? abierta.email}
              </h3>
              <button
                onClick={() => setAbierta(null)}
                className="text-brand-gray hover:text-brand-navy"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div>
                <p className="text-xs text-brand-gray mb-1">Email</p>
                <p>{abierta.email}</p>
              </div>
              <div>
                <p className="text-xs text-brand-gray mb-1">
                  ¿Con qué frecuencia usás TasaProp?
                </p>
                <p>{textoFrecuencia(abierta.frecuencia_uso)}</p>
              </div>
              <div>
                <p className="text-xs text-brand-gray mb-1">
                  ¿Qué la alejó de seguir usándola?
                </p>
                <p>{abierta.motivo_abandono.map(textoMotivo).join(", ")}</p>
                {abierta.motivo_otro && (
                  <p className="text-brand-gray mt-1">&ldquo;{abierta.motivo_otro}&rdquo;</p>
                )}
              </div>
              {abierta.percepcion_precio && (
                <div>
                  <p className="text-xs text-brand-gray mb-1">Precio</p>
                  <p>
                    {textoPrecio(abierta.percepcion_precio)}
                    {abierta.precio_dispuesto
                      ? ` — pagaría: ${abierta.precio_dispuesto}`
                      : ""}
                  </p>
                </div>
              )}
              {abierta.tasacion_precision && (
                <div>
                  <p className="text-xs text-brand-gray mb-1">
                    ¿La tasación coincidió con lo esperado?
                  </p>
                  <p>{textoTasacion(abierta.tasacion_precision)}</p>
                </div>
              )}
              {abierta.comentario && (
                <div>
                  <p className="text-xs text-brand-gray mb-1">Comentario</p>
                  <p>{abierta.comentario}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-brand-gray mb-1">WhatsApp</p>
                <p>{abierta.whatsapp ?? "No dejó"}</p>
              </div>
              <div>
                <p className="text-xs text-brand-gray mb-1">Respondió el</p>
                <p>{formatFechaCorta(abierta.created_at.slice(0, 10))}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
