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
    .from("usuarios_app")
    .select("*")
    .order("nombre", { ascending: true });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Usuarios");
  ws.columns = [
    { header: "Nombre", key: "nombre", width: 30 },
    { header: "Email", key: "email", width: 32 },
    { header: "Contactado", key: "contactado_txt", width: 14 },
    { header: "Notas", key: "notas", width: 30 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const u of data ?? []) {
    ws.addRow({
      nombre: u.nombre,
      email: u.email,
      contactado_txt: u.contactado ? "Sí" : "No",
      notas: u.notas,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="usuarios_tasaprop.xlsx"',
    },
  });
}
