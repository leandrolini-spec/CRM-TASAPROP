"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IconBell } from "@/components/icons";
import { mailtoLink } from "@/lib/contact-links";
import { useFirma } from "@/lib/firma-context";

type Notificacion = {
  id: string;
  de: string | null;
  asunto: string | null;
  recibido_en: string | null;
  cuerpo: string | null;
};

type Vencimiento = {
  id: string;
  nombre: string;
  estado: string;
  fecha_vencimiento: string;
};

const INTERVALO_MS = 4 * 60 * 1000;
const DIAS_AVISO_VENCIMIENTO = 7;

function tiempoRelativo(fecha: string | null) {
  if (!fecha) return "";
  const diffMin = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
  if (diffMin < 1) return "recién";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  return `hace ${Math.round(diffH / 24)} d`;
}

function parsearRemitente(de: string | null): { nombre: string; email: string | null } {
  if (!de) return { nombre: "Remitente desconocido", email: null };
  const match = de.match(/^(.*)<([^>]+)>\s*$/);
  if (match) {
    const nombre = match[1].trim().replace(/^"|"$/g, "");
    return { nombre: nombre || match[2], email: match[2] };
  }
  if (de.includes("@")) return { nombre: de, email: de.trim() };
  return { nombre: de, email: null };
}

function diasHasta(fecha: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const destino = new Date(fecha + "T00:00:00");
  return Math.round((destino.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000));
}

export default function MailBell({ variant = "light" }: { variant?: "light" | "dark" }) {
  const supabase = createClient();
  const firma = useFirma();
  const [abierto, setAbierto] = useState(false);
  const [notis, setNotis] = useState<Notificacion[]>([]);
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([]);
  const [mailAbierto, setMailAbierto] = useState<Notificacion | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const cargarNotis = useCallback(async () => {
    const { data } = await supabase
      .from("notificaciones_email")
      .select("id, de, asunto, recibido_en, cuerpo")
      .eq("leido", false)
      .order("recibido_en", { ascending: false })
      .limit(20);
    setNotis((data as Notificacion[]) ?? []);
  }, [supabase]);

  const cargarVencimientos = useCallback(async () => {
    const limite = new Date();
    limite.setDate(limite.getDate() + DIAS_AVISO_VENCIMIENTO);

    const [{ data: clientes }, { data: vistos }] = await Promise.all([
      supabase
        .from("clientes")
        .select("id, nombre, estado, fecha_vencimiento")
        .neq("estado", "Descartado")
        .not("fecha_vencimiento", "is", null)
        .lte("fecha_vencimiento", limite.toISOString().slice(0, 10))
        .order("fecha_vencimiento", { ascending: true }),
      // Vencimientos que ya marcamos como vistos — si después el cliente
      // cambia de fecha (se renueva), esa combinación es nueva y vuelve a
      // avisar, aunque el cliente ya haya sido visto antes.
      supabase.from("vencimientos_vistos").select("cliente_id, fecha_vencimiento"),
    ]);

    const vistosSet = new Set(
      (vistos ?? []).map((v) => `${v.cliente_id}|${v.fecha_vencimiento}`)
    );
    const pendientes = ((clientes as Vencimiento[]) ?? []).filter(
      (c) => !vistosSet.has(`${c.id}|${c.fecha_vencimiento}`)
    );
    setVencimientos(pendientes);
  }, [supabase]);

  const chequear = useCallback(async () => {
    try {
      await fetch("/api/mail/check", { method: "POST" });
    } catch {
      // silencioso: si falla el chequeo no interrumpe el uso del CRM
    }
    await Promise.all([cargarNotis(), cargarVencimientos()]);
  }, [cargarNotis, cargarVencimientos]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial al montar, el setState ocurre después del await
    chequear();
    const interval = setInterval(chequear, INTERVALO_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  async function abrirMail(n: Notificacion) {
    setMailAbierto(n);
    setNotis((prev) => prev.filter((x) => x.id !== n.id));
    const { error } = await supabase
      .from("notificaciones_email")
      .update({ leido: true })
      .eq("id", n.id);
    if (error) cargarNotis();
  }

  async function descartarVencimiento(v: Vencimiento) {
    setVencimientos((prev) => prev.filter((x) => x.id !== v.id));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("vencimientos_vistos").upsert(
      { profile_id: user.id, cliente_id: v.id, fecha_vencimiento: v.fecha_vencimiento },
      { onConflict: "profile_id,cliente_id,fecha_vencimiento" }
    );
  }

  const totalAvisos = notis.length + vencimientos.length;

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className={`relative w-9 h-9 rounded-lg flex items-center justify-center ${
          variant === "dark"
            ? "text-brand-lime hover:bg-white/10"
            : "text-brand-navy hover:bg-gray-100"
        }`}
        aria-label="Notificaciones"
      >
        <IconBell width={19} height={19} />
        {totalAvisos > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center font-semibold">
            {totalAvisos > 9 ? "9+" : totalAvisos}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute left-0 top-11 z-50 w-80 max-h-96 overflow-y-auto bg-white border rounded-xl shadow-lg">
          {totalAvisos === 0 && (
            <div className="px-3 py-6 text-center text-xs text-[#72767B]">
              Sin notificaciones nuevas.
            </div>
          )}

          {vencimientos.length > 0 && (
            <>
              <div className="px-3 py-2 border-b text-xs font-semibold text-[#72767B]">
                Vencimientos próximos
              </div>
              {vencimientos.map((v) => {
                const dias = diasHasta(v.fecha_vencimiento);
                return (
                  <Link
                    key={v.id}
                    href="/clientes"
                    onClick={() => {
                      setAbierto(false);
                      descartarVencimiento(v);
                    }}
                    className="block w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#17184B] truncate">
                        {v.nombre}
                      </span>
                      <span
                        className={`text-[10px] shrink-0 ${
                          dias <= 0 ? "text-red-600 font-semibold" : "text-[#72767B]"
                        }`}
                      >
                        {dias <= 0 ? "Vencido" : `en ${dias} d`}
                      </span>
                    </div>
                    <div className="text-xs text-[#72767B] truncate">{v.estado}</div>
                  </Link>
                );
              })}
            </>
          )}

          {notis.length > 0 && (
            <>
              <div className="px-3 py-2 border-b text-xs font-semibold text-[#72767B]">
                Correos nuevos
              </div>
              {notis.map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrirMail(n)}
                  className="w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-gray-50"
                  title="Abrir mail"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#17184B] truncate">
                      {n.de ?? "Remitente desconocido"}
                    </span>
                    <span className="text-[10px] text-[#72767B] shrink-0">
                      {tiempoRelativo(n.recibido_en)}
                    </span>
                  </div>
                  <div className="text-xs text-[#72767B] truncate">
                    {n.asunto ?? "(sin asunto)"}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {mailAbierto &&
        (() => {
          const { nombre, email } = parsearRemitente(mailAbierto.de);
          const inicial = nombre.trim().charAt(0).toUpperCase() || "?";
          const responder = mailtoLink(email, firma);
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B23]/50 backdrop-blur-[2px]"
              onClick={() => setMailAbierto(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 px-6 pt-6 pb-4 shrink-0">
                  <span className="shrink-0 w-11 h-11 rounded-full bg-[#17184B] text-white flex items-center justify-center text-base font-semibold">
                    {inicial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#17184B] truncate">{nombre}</p>
                    {email && (
                      <p className="text-xs text-[#72767B] truncate">{email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setMailAbierto(null)}
                    aria-label="Cerrar"
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#72767B] hover:bg-gray-100 hover:text-[#17184B] text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="px-6 pb-4 shrink-0 border-b">
                  <h3 className="text-lg font-semibold text-[#17184B] break-words">
                    {mailAbierto.asunto ?? "(sin asunto)"}
                  </h3>
                  <p className="text-xs text-[#72767B] mt-1">
                    {mailAbierto.recibido_en
                      ? new Date(mailAbierto.recibido_en).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "long",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </p>
                </div>

                <div className="px-6 py-5 overflow-y-auto min-h-0">
                  {mailAbierto.cuerpo && mailAbierto.cuerpo.trim() ? (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#202124]">
                      {mailAbierto.cuerpo}
                    </p>
                  ) : (
                    <p className="text-sm text-[#72767B] italic">
                      No se pudo traer el contenido de este mail. Abrilo directamente en tu
                      casilla de correo.
                    </p>
                  )}
                </div>

                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-2 shrink-0">
                  <button
                    onClick={() => setMailAbierto(null)}
                    className="rounded-lg border text-sm font-medium px-4 py-2 text-[#72767B] hover:bg-white"
                  >
                    Cerrar
                  </button>
                  {responder && (
                    <button
                      onClick={() =>
                        window.open(
                          responder,
                          "tasaprop-compose",
                          "width=680,height=640,resizable=yes,scrollbars=yes,noopener,noreferrer"
                        )
                      }
                      className="rounded-lg bg-[#17184B] text-white text-sm font-medium px-4 py-2 hover:opacity-90"
                    >
                      Responder
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
