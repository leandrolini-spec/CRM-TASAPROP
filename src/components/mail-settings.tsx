"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MailSettings({ profileId }: { profileId: string }) {
  const supabase = createClient();
  const [cargado, setCargado] = useState(false);
  const [configurado, setConfigurado] = useState(false);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("993");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [ultimoError, setUltimoError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mail_config")
        .select("imap_host, imap_port, imap_user, last_error")
        .eq("profile_id", profileId)
        .maybeSingle();
      if (data) {
        setConfigurado(true);
        setHost(data.imap_host);
        setPort(String(data.imap_port));
        setUsuario(data.imap_user);
        setUltimoError(data.last_error);
      }
      setCargado(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!host.trim() || !usuario.trim() || (!configurado && !password.trim())) return;
    setGuardando(true);
    setMensaje(null);

    const campos: Record<string, unknown> = {
      imap_host: host.trim(),
      imap_port: Number(port) || 993,
      imap_user: usuario.trim(),
    };
    if (password.trim()) campos.imap_password = password.trim();

    // upsert exige todas las columnas NOT NULL incluso al actualizar una fila
    // existente, así que si no hay config previa insertamos (con contraseña
    // obligatoria) y si ya existe hacemos un update parcial en su lugar.
    const { error } = configurado
      ? await supabase.from("mail_config").update(campos).eq("profile_id", profileId)
      : await supabase
          .from("mail_config")
          .insert({ ...campos, profile_id: profileId });

    setGuardando(false);
    setPassword("");
    if (error) {
      setMensaje("No se pudo guardar. " + error.message);
    } else {
      setConfigurado(true);
      setUltimoError(null);
      setMensaje("Guardado. Se va a verificar en el próximo chequeo.");
      fetch("/api/mail/check", { method: "POST" }).catch(() => {});
    }
  }

  if (!cargado) return null;

  return (
    <form onSubmit={guardar} className="space-y-2.5">
      <input
        className="w-full border rounded-lg px-2.5 py-1.5 text-sm"
        placeholder="Servidor (ej. mail.tasaprop.com)"
        value={host}
        onChange={(e) => setHost(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          className="w-16 min-w-0 border rounded-lg px-2 py-1.5 text-sm"
          placeholder="Puerto"
          value={port}
          onChange={(e) => setPort(e.target.value)}
        />
        <input
          className="flex-1 min-w-0 border rounded-lg px-2.5 py-1.5 text-sm"
          placeholder="Usuario"
          title="Usuario (tu email completo)"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
      </div>
      <input
        type="password"
        className="w-full border rounded-lg px-2.5 py-1.5 text-sm"
        placeholder={configurado ? "Contraseña (dejar en blanco para no cambiarla)" : "Contraseña"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-lg border border-[#17184B] text-[#17184B] text-xs font-medium py-1.5 hover:bg-gray-50 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : configurado ? "Actualizar" : "Conectar casilla"}
      </button>
      {mensaje && <p className="text-[11px] text-[#72767B]">{mensaje}</p>}
      {ultimoError && (
        <p className="text-[11px] text-red-600">
          Último chequeo falló: {ultimoError}
        </p>
      )}
    </form>
  );
}
