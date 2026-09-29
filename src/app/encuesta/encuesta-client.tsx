"use client";

import { useState } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/Button";
import {
  FRECUENCIA_OPCIONES,
  MOTIVO_OPCIONES,
  PRECIO_OPCIONES,
  TASACION_OPCIONES,
} from "@/lib/encuesta-opciones";

type Paso = "email" | "frecuencia" | "motivo" | "precio" | "tasacion" | "final" | "gracias";

export default function EncuestaClient({
  emailInicial,
  nombreInicial,
}: {
  emailInicial: string | null;
  nombreInicial: string | null;
}) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const pasos: Paso[] = emailInicial
    ? ["frecuencia", "motivo", "precio", "tasacion", "final"]
    : ["email", "frecuencia", "motivo", "precio", "tasacion", "final"];

  const [pasoIdx, setPasoIdx] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(emailInicial ?? "");
  const [frecuencia, setFrecuencia] = useState("");
  const [motivo, setMotivo] = useState<string[]>([]);
  const [motivoOtro, setMotivoOtro] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioDispuesto, setPrecioDispuesto] = useState("");
  const [tasacion, setTasacion] = useState("");
  const [comentario, setComentario] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const paso = pasos[pasoIdx];
  const progreso = Math.round(((pasoIdx + 1) / pasos.length) * 100);

  function siguiente() {
    setError(null);
    if (pasoIdx < pasos.length - 1) setPasoIdx(pasoIdx + 1);
  }
  function anterior() {
    setError(null);
    if (pasoIdx > 0) setPasoIdx(pasoIdx - 1);
  }

  function toggleMotivo(valor: string) {
    setMotivo((prev) =>
      prev.includes(valor) ? prev.filter((m) => m !== valor) : [...prev, valor]
    );
  }

  function puedeAvanzar() {
    if (paso === "email") return email.trim().includes("@");
    if (paso === "frecuencia") return frecuencia !== "";
    if (paso === "motivo") return motivo.length > 0;
    if (paso === "precio") return precio !== "";
    if (paso === "tasacion") return tasacion !== "";
    return true;
  }

  async function enviar() {
    setEnviando(true);
    setError(null);
    const { error } = await supabase.rpc("guardar_respuesta_encuesta", {
      p_email: email.trim(),
      p_frecuencia_uso: frecuencia,
      p_motivo_abandono: motivo,
      p_motivo_otro: motivo.includes("otro") ? motivoOtro || null : null,
      p_percepcion_precio: precio,
      p_precio_dispuesto: precioDispuesto || null,
      p_tasacion_precision: tasacion,
      p_whatsapp: whatsapp || null,
      p_comentario: comentario || null,
    });
    setEnviando(false);
    if (error) {
      setError("No se pudo enviar. Probá de nuevo en un momento.");
      return;
    }
    setEnviado(true);
  }

  const opcionClase = (activo: boolean) =>
    `w-full text-left rounded-lg border px-4 py-3 text-base font-medium transition ${
      activo
        ? "border-brand-navy bg-brand-navy text-white"
        : "border-gray-300 text-brand-ink hover:border-brand-navy/50 hover:bg-gray-50"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <Image
          src="/logo-tasaprop.png"
          alt="Tasaprop"
          width={1954}
          height={403}
          className="mb-6 h-auto w-[160px] mx-auto"
          priority
        />

        {enviado ? (
          <div className="text-center space-y-3 py-4">
            <h1 className="text-lg font-bold text-brand-navy">
              ¡Gracias{nombreInicial ? `, ${nombreInicial.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-sm text-brand-gray">
              Ya recibimos tus respuestas. En breve te contactamos para activarte
              tu semana de prueba gratis.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-lime transition-all duration-300"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>

            {nombreInicial && pasoIdx === 0 && (
              <p className="text-base text-brand-ink mb-4 text-center">
                Hola {nombreInicial.split(" ")[0]} — esto te va a llevar menos de
                2 minutos, y a cambio te regalamos una semana de prueba gratis.
              </p>
            )}

            {paso === "email" && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-brand-navy">
                  Antes de arrancar, ¿cuál es tu email?
                </h2>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                />
              </div>
            )}

            {paso === "frecuencia" && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-brand-navy">
                  ¿Con qué frecuencia usás TasaProp?
                </h2>
                <div className="space-y-2">
                  {FRECUENCIA_OPCIONES.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setFrecuencia(op.valor)}
                      className={opcionClase(frecuencia === op.valor)}
                    >
                      {op.texto}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paso === "motivo" && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-brand-navy">
                  ¿Tuviste algún problema al usar la app?
                </h2>
                <p className="text-sm text-brand-gray">Podés elegir más de una.</p>
                <div className="space-y-2">
                  {MOTIVO_OPCIONES.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => toggleMotivo(op.valor)}
                      className={opcionClase(motivo.includes(op.valor))}
                    >
                      {op.texto}
                    </button>
                  ))}
                </div>
                {motivo.includes("otro") && (
                  <input
                    type="text"
                    value={motivoOtro}
                    onChange={(e) => setMotivoOtro(e.target.value)}
                    placeholder="Contanos un poco más..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  />
                )}
              </div>
            )}

            {paso === "precio" && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-brand-navy">
                  ¿Te pareció caro, justo o barato el precio actual?
                </h2>
                <div className="space-y-2">
                  {PRECIO_OPCIONES.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setPrecio(op.valor)}
                      className={opcionClase(precio === op.valor)}
                    >
                      {op.texto}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={precioDispuesto}
                  onChange={(e) => setPrecioDispuesto(e.target.value)}
                  placeholder="¿Cuánto pagarías por mes? (opcional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                />
              </div>
            )}

            {paso === "tasacion" && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-brand-navy">
                  ¿El valor que te dio se acercó a lo que esperabas del mercado?
                </h2>
                <div className="space-y-2">
                  {TASACION_OPCIONES.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setTasacion(op.valor)}
                      className={opcionClase(tasacion === op.valor)}
                    >
                      {op.texto}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paso === "final" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-brand-navy">
                    ¿Qué cambiarías para usarla más seguido?
                  </h2>
                  <p className="text-sm text-brand-gray">Opcional.</p>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-brand-navy">
                    Dejanos tu WhatsApp
                  </h2>
                  <p className="text-sm text-brand-gray">
                    Opcional — para avisarte más rápido cuando esté activa tu
                    semana gratis.
                  </p>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="11 2345 6789"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="flex items-center justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={anterior}
                disabled={pasoIdx === 0}
                className="text-sm text-brand-gray hover:text-brand-navy disabled:opacity-0"
              >
                Atrás
              </button>
              {paso === "final" ? (
                <Button onClick={enviar} disabled={enviando}>
                  {enviando ? "Enviando..." : "Enviar"}
                </Button>
              ) : (
                <Button onClick={siguiente} disabled={!puedeAvanzar()}>
                  Siguiente
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
