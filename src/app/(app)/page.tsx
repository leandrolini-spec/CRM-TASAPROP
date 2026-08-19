import { createClient } from "@/lib/supabase/server";

const ESTADOS = [
  "Pendiente",
  "Enviado",
  "Respondió",
  "Interesado",
  "Reunión",
  "No interesado",
  "Baja",
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: totalContactos } = await supabase
    .from("contactos")
    .select("*", { count: "exact", head: true });

  const conteos = await Promise.all(
    ESTADOS.map(async (estado) => {
      const { count } = await supabase
        .from("contactos")
        .select("*", { count: "exact", head: true })
        .eq("estado", estado);
      return { estado, count: count ?? 0 };
    })
  );

  const { data: pagosRecientes } = await supabase
    .from("pagos")
    .select("fecha, cliente_nombre, total_recibir")
    .order("fecha", { ascending: false })
    .limit(5);

  const { count: clientesActivos } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#17184B]">Panel</h1>
        <p className="text-sm text-[#72767B]">
          Resumen general — reemplaza la solapa &ldquo;Tablero&rdquo; del
          Excel.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Contactos totales" value={totalContactos ?? 0} />
        <StatCard label="Clientes cargados" value={clientesActivos ?? 0} />
        <StatCard
          label="Interesados"
          value={conteos.find((c) => c.estado === "Interesado")?.count ?? 0}
        />
        <StatCard
          label="Reuniones"
          value={conteos.find((c) => c.estado === "Reunión")?.count ?? 0}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#17184B] mb-3">
          Embudo comercial
        </h2>
        <div className="bg-white rounded-xl border p-4 space-y-2">
          {conteos.map(({ estado, count }) => (
            <div key={estado} className="flex items-center gap-3">
              <span className="w-32 text-sm text-[#202124]">{estado}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-[#3CC8DD]"
                  style={{
                    width: `${
                      totalContactos ? (count / totalContactos) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-sm font-medium">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#17184B] mb-3">
          Últimos pagos
        </h2>
        <div className="bg-white rounded-xl border divide-y">
          {pagosRecientes && pagosRecientes.length > 0 ? (
            pagosRecientes.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>{p.cliente_nombre}</span>
                <span className="text-[#72767B]">{p.fecha}</span>
                <span className="font-medium">
                  ${Number(p.total_recibir).toLocaleString("es-AR")}
                </span>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-[#72767B]">
              Todavía no hay pagos cargados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-[#72767B]">{label}</p>
      <p className="text-2xl font-bold text-[#17184B]">{value}</p>
    </div>
  );
}
