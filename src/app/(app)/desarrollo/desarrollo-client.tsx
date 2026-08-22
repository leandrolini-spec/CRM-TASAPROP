"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFechaCorta } from "@/lib/date";

type Informe = {
  id: string;
  fecha: string;
  titulo: string;
  archivo_url: string | null;
  archivo_nombre: string | null;
  created_at: string;
};

export default function DesarrolloClient({ initial }: { initial: Informe[] }) {
  const supabase = createClient();
  const [informes, setInformes] = useState<Informe[]>(initial);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nuevo, setNuevo] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    titulo: "Informe de desarrollo",
  });
  const [subiendo, setSubiendo] = useState(false);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.titulo.trim()) return;
    setSubiendo(true);

    const file = fileInputRef.current?.files?.[0];
    let archivo_url: string | null = null;
    let archivo_nombre: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      // eslint-disable-next-line react-hooks/purity -- solo corre en el submit del form, nunca durante el render
      const path = `${Date.now()}-${file.name}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("desarrollo")
        .upload(path, file);
      if (!uploadError) {
        const { data } = supabase.storage.from("desarrollo").getPublicUrl(path);
        archivo_url = data.publicUrl;
        archivo_nombre = file.name;
      }
    }

    const { data: insertado } = await supabase
      .from("desarrollo_informes")
      .insert({
        fecha: nuevo.fecha,
        titulo: nuevo.titulo,
        archivo_url,
        archivo_nombre,
      })
      .select()
      .single();

    if (insertado) setInformes((prev) => [insertado as Informe, ...prev]);
    setNuevo({
      fecha: new Date().toISOString().slice(0, 10),
      titulo: "Informe de desarrollo",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSubiendo(false);
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este informe?")) return;
    setInformes((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("desarrollo_informes").delete().eq("id", id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Desarrollo</h1>
        <p className="text-sm text-brand-gray">
          Archivo de los informes de desarrollo del ingeniero de sistemas — el detalle
          completo queda en el PDF adjunto.
        </p>
      </div>

      <form
        onSubmit={agregar}
        className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
      >
        <input
          type="date"
          className="border rounded-lg px-3 py-2 text-sm"
          value={nuevo.fecha}
          onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })}
          required
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
          placeholder="Título *"
          value={nuevo.titulo}
          onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })}
          required
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="text-xs md:col-span-2"
        />
        <button
          type="submit"
          disabled={subiendo}
          className="rounded-lg bg-brand-navy text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50 md:col-span-6"
        >
          {subiendo ? "Subiendo..." : "+ Agregar informe"}
        </button>
      </form>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">PDF</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {informes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-brand-gray">
                  Sin informes todavía.
                </td>
              </tr>
            )}
            {informes.map((i) => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="px-3 py-2">{formatFechaCorta(i.fecha)}</td>
                <td className="px-3 py-2 font-medium">{i.titulo}</td>
                <td className="px-3 py-2">
                  {i.archivo_url ? (
                    <a
                      href={i.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-navy underline"
                    >
                      Ver PDF
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => eliminar(i.id)}
                    className="text-xs text-brand-gray hover:text-red-600"
                  >
                    Eliminar
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
