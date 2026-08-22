"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cerrarSesion } from "@/lib/auth";
import MailSettings from "@/components/mail-settings";

type Profile = {
  id: string;
  nombre: string;
  email: string;
  rol: string | null;
  telefono: string | null;
  email_trabajo: string | null;
  firma: string | null;
  avatar_url: string | null;
};

export default function PerfilClient({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState(profile.nombre);
  const [telefono, setTelefono] = useState(profile.telefono ?? "");
  const [emailTrabajo, setEmailTrabajo] = useState(profile.email_trabajo ?? "");
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [firma, setFirma] = useState(profile.firma ?? "");
  const [guardandoFirma, setGuardandoFirma] = useState(false);
  const [firmaGuardada, setFirmaGuardada] = useState(false);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await supabase
      .from("profiles")
      .update({ nombre, telefono: telefono || null, email_trabajo: emailTrabajo || null })
      .eq("id", profile.id);
    setGuardando(false);
    router.refresh();
  }

  async function guardarFirma(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoFirma(true);
    setFirmaGuardada(false);
    await supabase
      .from("profiles")
      .update({ firma: firma || null })
      .eq("id", profile.id);
    setGuardandoFirma(false);
    setFirmaGuardada(true);
    router.refresh();
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoFoto(true);
    const ext = file.name.split(".").pop();
    const path = `${profile.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", profile.id);
      router.refresh();
    }
    setSubiendoFoto(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Mi perfil</h1>
        <p className="text-sm text-brand-gray">
          Tus datos, firma de correo y notificaciones. Solo vos podés editar esto.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-brand-navy">Datos personales</h2>

        <div className="flex items-center gap-3">
          <span
            className={`relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold overflow-hidden ${
              profile.avatar_url ? "bg-white border" : "bg-brand-navy text-white"
            }`}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.nombre}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              profile.nombre.slice(0, 1).toUpperCase()
            )}
          </span>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={subirFoto}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoFoto}
              className="text-sm text-brand-navy underline disabled:opacity-50"
            >
              {subiendoFoto ? "Subiendo..." : "Cambiar foto / logo"}
            </button>
          </div>
        </div>

        <form onSubmit={guardarPerfil} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-brand-gray mb-1">Nombre</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-brand-gray mb-1">Email de acceso</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-brand-gray"
                value={profile.email}
                disabled
              />
            </div>
            <div>
              <label className="block text-xs text-brand-gray mb-1">Teléfono</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-brand-gray mb-1">Mi email de trabajo</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="nombre@tasaprop.com"
                value={emailTrabajo}
                onChange={(e) => setEmailTrabajo(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-brand-gray">
            El email de trabajo es solo de referencia dentro del sistema. Para
            que los correos salgan realmente desde esa dirección, tenés que
            configurarla como predeterminada en tu propio Gmail.
          </p>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-brand-navy">Firma de correo</h2>
          <p className="text-xs text-brand-gray mt-0.5">
            Se agrega automáticamente al final cuando abrís un mail desde el
            ícono de contacto en Contactos o Seguimiento.
          </p>
        </div>
        <form onSubmit={guardarFirma} className="space-y-2.5">
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-28"
            placeholder={"Ej.\nLeandro Lini\nTasaprop\nleandro.lini@tasaprop.com"}
            value={firma}
            onChange={(e) => {
              setFirma(e.target.value);
              setFirmaGuardada(false);
            }}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={guardandoFirma}
              className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              {guardandoFirma ? "Guardando..." : "Guardar firma"}
            </button>
            {firmaGuardada && (
              <span className="text-xs text-green-600">Firma guardada.</span>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-brand-navy">
            Notificaciones de correo (IMAP)
          </h2>
          <p className="text-xs text-brand-gray mt-0.5">
            Conectá tu casilla para ver acá los correos nuevos que te llegan.
          </p>
        </div>
        <MailSettings profileId={profile.id} />
      </div>

      <button
        type="button"
        onClick={() => cerrarSesion(supabase, router)}
        className="rounded-lg border text-sm font-medium px-4 py-2 text-brand-gray hover:bg-gray-50"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
