import {
  Users,
  Handshake,
  Star,
  CalendarCheck,
  Wallet,
  Receipt,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

const ETAPAS_CIERRE = new Set(["Cliente", "Alianza"]);
const ETAPAS_DESCARTE = new Set(["No interesado", "Baja"]);

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: etapas } = await supabase
    .from("etapas_seguimiento")
    .select("nombre")
    .order("orden", { ascending: true });

  const nombresEtapas = (etapas ?? []).map((e) => e.nombre);

  const { count: totalContactos } = await supabase
    .from("contactos")
    .select("*", { count: "exact", head: true })
    .eq("archivado", false);

  const conteos = await Promise.all(
    nombresEtapas.map(async (estado) => {
      const { count } = await supabase
        .from("contactos")
        .select("*", { count: "exact", head: true })
        .eq("estado", estado)
        .eq("archivado", false);
      return { estado, count: count ?? 0 };
    })
  );

  const { count: clientesActivos } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .neq("estado", "Descartado");

  const { data: pagos } = await supabase.from("pagos").select("total_recibir");
  const totalIngresosMP = (pagos ?? []).reduce(
    (acc, p) => acc + Number(p.total_recibir),
    0
  );

  const { data: gastos } = await supabase.from("gastos").select("monto, moneda");
  const totalGastos = (gastos ?? []).reduce(
    (acc, g) => {
      acc[g.moneda as "ARS" | "USD"] += Number(g.monto);
      return acc;
    },
    { ARS: 0, USD: 0 }
  );

  const hoy = new Date().toISOString().slice(0, 10);
  const { data: proximosEventos } = await supabase
    .from("eventos")
    .select("id, titulo, fecha, hora")
    .gte("fecha", hoy)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true })
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Panel</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Contactos totales" value={totalContactos ?? 0} />
        <StatCard
          icon={Handshake}
          label="Pruebas / Alianzas"
          value={clientesActivos ?? 0}
        />
        <StatCard
          icon={Star}
          label="Interesados"
          value={conteos.find((c) => c.estado === "Interesado")?.count ?? 0}
        />
        <StatCard
          icon={CalendarCheck}
          label="Reuniones"
          value={conteos.find((c) => c.estado === "Reunión")?.count ?? 0}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-brand-navy mb-3">
          Embudo comercial
        </h2>
        <Card className="p-4 space-y-2">
          {conteos.map(({ estado, count }) => {
            const barColor = ETAPAS_CIERRE.has(estado)
              ? "bg-brand-lime"
              : ETAPAS_DESCARTE.has(estado)
                ? "bg-gray-300"
                : "bg-brand-cyan";
            return (
              <div key={estado} className="flex items-center gap-3">
                <span className="w-32 text-sm text-brand-ink truncate">{estado}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${barColor}`}
                    style={{
                      width: `${
                        totalContactos ? (count / totalContactos) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium">{count}</span>
              </div>
            );
          })}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-full bg-brand-cyan/15 flex items-center justify-center shrink-0">
              <Wallet size={14} className="text-brand-navy" />
            </span>
            <p className="text-xs text-brand-gray">Total Ingresos MP</p>
          </div>
          <p className="text-2xl font-bold text-brand-navy">
            ${totalIngresosMP.toLocaleString("es-AR")}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-full bg-brand-cyan/15 flex items-center justify-center shrink-0">
              <Receipt size={14} className="text-brand-navy" />
            </span>
            <p className="text-xs text-brand-gray">Total Gastos</p>
          </div>
          <p className="text-2xl font-bold text-brand-navy">
            ${totalGastos.ARS.toLocaleString("es-AR")}
          </p>
          <p className="text-sm text-brand-gray">
            u$s{totalGastos.USD.toLocaleString("en-US")}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-full bg-brand-cyan/15 flex items-center justify-center shrink-0">
              <CalendarClock size={14} className="text-brand-navy" />
            </span>
            <p className="text-xs text-brand-gray">Próximos eventos</p>
          </div>
          {proximosEventos && proximosEventos.length > 0 ? (
            <ul className="space-y-1.5">
              {proximosEventos.map((e) => (
                <li key={e.id} className="text-sm flex items-center justify-between gap-2">
                  <span className="text-brand-ink truncate">{e.titulo}</span>
                  <span className="text-xs text-brand-gray shrink-0">
                    {new Date(e.fecha + "T00:00:00").toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                    {e.hora ? ` ${e.hora.slice(0, 5)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-gray">Sin eventos próximos.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-full bg-brand-lime/25 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-brand-navy" />
        </span>
        <p className="text-xs text-brand-gray">{label}</p>
      </div>
      <p className="text-2xl font-bold text-brand-navy">{value}</p>
    </Card>
  );
}
