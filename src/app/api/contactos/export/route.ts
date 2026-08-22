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
    .from("contactos")
    .select("*")
    .order("created_at", { ascending: false });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Contactos");
  ws.columns = [
    { header: "Inmobiliaria", key: "inmobiliaria", width: 30 },
    { header: "Localidad", key: "barrio", width: 20 },
    { header: "Teléfono", key: "telefono", width: 18 },
    { header: "Email", key: "email", width: 28 },
    { header: "Instagram", key: "instagram", width: 20 },
    { header: "Web", key: "web", width: 24 },
    { header: "Fuente", key: "fuente", width: 20 },
    { header: "Estado", key: "estado", width: 16 },
    { header: "Notas", key: "notas", width: 30 },
    { header: "Archivado", key: "archivado_txt", width: 12 },
    { header: "Creado", key: "creado_txt", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const c of data ?? []) {
    ws.addRow({
      inmobiliaria: c.inmobiliaria,
      barrio: c.barrio,
      telefono: c.telefono,
      email: c.email,
      instagram: c.instagram,
      web: c.web,
      fuente: c.fuente,
      estado: c.estado,
      notas: c.notas,
      archivado_txt: c.archivado ? "Sí" : "No",
      creado_txt: c.created_at ? new Date(c.created_at).toLocaleDateString("es-AR") : "",
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="contactos_tasaprop.xlsx"',
    },
  });
}
