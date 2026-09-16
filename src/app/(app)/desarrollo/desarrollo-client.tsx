"use client";

import { useRef, useState } from "react";
import { Upload, Eye, Download, Trash2, X } from "lucide-react";
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

function pathDesdeUrl(url: string) {
  const marcador = "/desarrollo/";
  const i = url.indexOf(marcador);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marcador.length));
}

export default function DesarrolloClient({ initial }: { initial: Informe[] }) {
  const supabase = createClient();
  const [informes, setInformes] = useState<Informe[]>(initial);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [nuevo, setNuevo] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    titulo: "Informe de desarrollo",
  });
  const [subiendo, setSubiendo] = useState(false);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const [previsualizando, setPrevisualizando] = useState<Informe | null>(null);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.titulo.trim()) return;
    setSubiendo(true);

    const file = fileInputRef.current?.files?.[0];
    let archivo_url: string | null = null;
    let archivo_nombre: string | null = null;
    if (file) {
      const path = `${Date.now()}-${file.name}`;
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
    setArchivoNombre("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSubiendo(false);
  }

  async function descargar(informe: Informe) {
    if (!informe.archivo_url) return;
    setDescargandoId(informe.id);
    try {
      const res = await fetch(informe.archivo_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = informe.archivo_nombre ?? "informe.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDescargandoId(null);
    }
  }

  async function eliminar(informe: Informe) {
    if (!confirm("¿Eliminar este informe?")) return;
    setInformes((prev) => prev.filter((i) => i.id !== informe.id));
    if (previsualizando?.id === informe.id) setPrevisualizando(null);
    if (informe.archivo_url) {
      const path = pathDesdeUrl(informe.archivo_url);
      if (path) await supabase.storage.from("desarrollo").remove([path]);
    }
    await supabase.from("desarrollo_informes").delete().eq("id", informe.id);
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
        <div className="md:col-span-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            id="archivo-informe"
            className="hidden"
            onChange={(e) => setArchivoNombre(e.target.files?.[0]?.name ?? "")}
          />
          <label
            htmlFor="archivo-informe"
            className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-brand-gray"
          >
            <Upload size={16} className="shrink-0" />
            <span className="truncate">{archivoNombre || "Subir PDF"}</span>
          </label>
        </div>
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
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {informes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-brand-gray">
                  Sin informes todavía.
                </td>
              </tr>
            )}
            {informes.map((i) => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="px-3 py-2 whitespace-nowrap">{formatFechaCorta(i.fecha)}</td>
                <td className="px-3 py-2 font-medium">{i.titulo}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-3">
                    {i.archivo_url ? (
                      <>
                        <button
                          onClick={() => setPrevisualizando(i)}
                          title="Previsualizar PDF"
                          className="text-brand-navy hover:opacity-70"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          onClick={() => descargar(i)}
                          disabled={descargandoId === i.id}
                          title="Descargar PDF"
                          className="text-brand-navy hover:opacity-70 disabled:opacity-50"
                        >
                          <Download size={17} />
                        </button>
                      </>
                    ) : (
                      <span title="Sin PDF adjunto" className="text-gray-300">
                        <Eye size={17} />
                      </span>
                    )}
                    <button
                      onClick={() => eliminar(i)}
                      title="Eliminar informe"
                      className="text-brand-gray hover:text-red-600"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previsualizando && previsualizando.archivo_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPrevisualizando(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-brand-navy truncate">
                {previsualizando.titulo}
              </h2>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => descargar(previsualizando)}
                  title="Descargar PDF"
                  className="text-brand-navy hover:opacity-70"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setPrevisualizando(null)}
                  title="Cerrar"
                  className="text-brand-gray hover:text-brand-navy"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe
              src={previsualizando.archivo_url}
              title={previsualizando.titulo}
              className="flex-1 w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
