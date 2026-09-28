"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type UsuarioApp = {
  id: string;
  nombre: string | null;
  email: string;
  contactado: boolean;
  notas: string | null;
  created_at: string;
};

export default function UsuariosClient({ initial }: { initial: UsuarioApp[] }) {
  const supabase = createClient();
  const [usuarios, setUsuarios] = useState<UsuarioApp[]>(initial);
  const [filtro, setFiltro] = useState("");
  const [verContactados, setVerContactados] = useState<"" | "si" | "no">("");

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

  const contactados = usuarios.filter((u) => u.contactado).length;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Usuarios</h1>
          <p className="text-sm text-brand-gray">
            Todas las cuentas registradas en la app de TasaProp — {usuarios.length}{" "}
            en total, {contactados} contactados.
          </p>
        </div>
        <a
          href="/api/usuarios/export"
          className="rounded-lg border text-sm font-medium px-3 py-2 text-brand-navy hover:bg-gray-50"
        >
          Exportar Excel
        </a>
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

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Contactado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-brand-gray">
                  Sin usuarios que coincidan.
                </td>
              </tr>
            )}
            {visibles.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{u.nombre ?? "-"}</td>
                <td className="px-3 py-2 text-brand-gray">{u.email}</td>
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
