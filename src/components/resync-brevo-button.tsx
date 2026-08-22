"use client";

import { useState } from "react";

export default function ResyncBrevoButton() {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState<{ corto: string; detalle: string; error: boolean } | null>(
    null
  );

  async function resincronizar() {
    setSincronizando(true);
    setResultado(null);
    const res = await fetch("/api/brevo/resync-all", { method: "POST" });
    const data = await res.json();
    setSincronizando(false);
    if (!res.ok) {
      setResultado({
        corto: "Error",
        detalle: data.error ?? "No se pudo sincronizar",
        error: true,
      });
      return;
    }
    setResultado({
      corto: `${data.ok}/${data.total}${data.fallidos ? ` (${data.fallidos} err.)` : ""}`,
      detalle:
        `${data.ok} de ${data.total} contactos sincronizados con Brevo.` +
        (data.fallidos ? ` ${data.fallidos} fallaron.` : ""),
      error: !!data.fallidos,
    });
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        type="button"
        onClick={resincronizar}
        disabled={sincronizando}
        className="rounded-lg border text-sm font-medium px-3 py-2 text-[#17184B] hover:bg-gray-50 disabled:opacity-50"
      >
        {sincronizando ? "Sincronizando..." : "Resincronizar con Brevo"}
      </button>
      {resultado && (
        <span
          title={resultado.detalle}
          className={`text-xs whitespace-nowrap ${
            resultado.error ? "text-red-600" : "text-green-700"
          }`}
        >
          {resultado.corto}
        </span>
      )}
    </div>
  );
}
