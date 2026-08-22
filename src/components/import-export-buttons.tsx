"use client";

import { useRef, useState } from "react";

export default function ImportExportButtons({
  entity,
  onImported,
}: {
  entity: "contactos" | "pagos" | "gastos";
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setResultado(null);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/${entity}/import`, { method: "POST", body: formData });
    const data = await res.json();

    setImportando(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!res.ok) {
      setResultado(`No se pudo importar: ${data.error ?? "error desconocido"}`);
      return;
    }
    setResultado(
      `Se cargaron ${data.inserted} filas nuevas.` +
        (data.actualizados ? ` ${data.actualizados} ya existían y se actualizaron.` : "") +
        (data.duplicadas ? ` ${data.duplicadas} eran duplicadas, se omitieron.` : "") +
        (data.omitidas ? ` (${data.omitidas} sin datos suficientes)` : "")
    );
    onImported();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a
        href={`/api/${entity}/export`}
        className="rounded-lg border text-sm font-medium px-3 py-2 text-[#17184B] hover:bg-gray-50"
      >
        Exportar Excel
      </a>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={importando}
        className="rounded-lg border text-sm font-medium px-3 py-2 text-[#17184B] hover:bg-gray-50 disabled:opacity-50"
      >
        {importando ? "Importando..." : "Importar Excel"}
      </button>
      {resultado && <span className="text-xs text-[#72767B]">{resultado}</span>}
    </div>
  );
}
