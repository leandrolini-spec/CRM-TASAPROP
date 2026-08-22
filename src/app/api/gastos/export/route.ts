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
    .from("gastos")
    .select("*")
    .order("fecha", { ascending: false });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Gastos");
  ws.columns = [
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Descripción", key: "descripcion", width: 30 },
    { header: "Categoría", key: "categoria", width: 22 },
    { header: "Moneda", key: "moneda", width: 10 },
    { header: "Monto", key: "monto", width: 14 },
    { header: "Notas", key: "notas", width: 30 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const g of data ?? []) {
    ws.addRow({
      fecha: g.fecha,
      descripcion: g.descripcion,
      categoria: g.categoria,
      moneda: g.moneda,
      monto: Number(g.monto),
      notas: g.notas,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="gastos_tasaprop.xlsx"',
    },
  });
}
