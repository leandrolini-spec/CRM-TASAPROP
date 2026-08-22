import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data } = await supabase
    .from("pagos")
    .select("*")
    .order("fecha", { ascending: false });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ingresos MP");
  ws.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Cliente", key: "cliente_nombre", width: 28 },
    { header: "Monto", key: "monto", width: 14 },
    { header: "Descuento MP", key: "descuento_mp", width: 16 },
    { header: "Total recibido", key: "total_recibir", width: 16 },
    { header: "Medio de pago", key: "medio_pago", width: 20 },
    { header: "Transferido", key: "transferido_txt", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const p of data ?? []) {
    ws.addRow({
      fecha: p.fecha,
      cliente_nombre: p.cliente_nombre,
      monto: Number(p.monto),
      descuento_mp: Number(p.descuento_mp),
      total_recibir: Number(p.total_recibir),
      medio_pago: p.medio_pago,
      transferido_txt: p.transferido ? "Sí" : "No",
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ingresos_mp_tasaprop.xlsx"',
    },
  });
}
