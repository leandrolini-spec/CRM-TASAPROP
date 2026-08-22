"use client";

import { useEffect, useState } from "react";

type Lista = { id: number; name: string; totalSubscribers: number };

export default function BrevoListCheck({
  onEmailsChange,
}: {
  onEmailsChange: (emails: Set<string> | null) => void;
}) {
  const [listas, setListas] = useState<Lista[]>([]);
  const [listaId, setListaId] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch("/api/brevo/lists")
      .then((r) => r.json())
      .then((data) => setListas(data.lists ?? []))
      .catch(() => {});
  }, []);

  async function elegir(id: string) {
    setListaId(id);
    if (!id) {
      onEmailsChange(null);
      return;
    }
    setCargando(true);
    const res = await fetch(`/api/brevo/list-members?listId=${id}`);
    const data = await res.json();
    setCargando(false);
    onEmailsChange(new Set<string>(data.emails ?? []));
  }

  return (
    <div>
      <label className="block text-xs text-[#72767B] mb-1">Ver quién ya está en...</label>
      <select
        value={listaId}
        onChange={(e) => elegir(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm"
      >
        <option value="">Ninguna lista</option>
        {listas.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      {cargando && <span className="ml-2 text-xs text-[#72767B]">Consultando Brevo...</span>}
    </div>
  );
}
