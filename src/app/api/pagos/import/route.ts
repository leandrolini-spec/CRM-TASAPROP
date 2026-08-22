import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { normalizarEncabezado, parseFechaCelda, parseNumeroCelda } from "@/lib/excel-import";

const MAX_SIZE = 10 * 1024 * 1024;

const MAPA_CAMPOS: Record<string, string> = {
  fecha: "fecha",
  cliente: "cliente_nombre",
  "cliente/concepto": "cliente_nombre",
  concepto: "cliente_nombre",
  monto: "monto",
  "descuento mp": "descuento_mp",
  descuento: "descuento_mp",
  "medio de pago": "medio_pago",
  medio: "medio_pago",
};

const CAMPOS_TEXTO = new Set(["cliente_nombre", "medio_pago"]);
const CAMPOS_NUMERICOS = new Set(["monto", "descuento_mp"]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "El archivo es demasiado grande (máx. 10MB)" },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo. ¿Es un .xlsx válido?" },
      { status: 400 }
    );
  }

  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });

  const columnas: (string | null)[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const texto = normalizarEncabezado(cell.text ?? "");
    columnas[colNumber] = MAPA_CAMPOS[texto] ?? null;
  });

  const filas: Record<string, string | number>[] = [];
  let omitidas = 0;
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const fila: Record<string, string | number> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const campo = columnas[colNumber];
      if (!campo) return;
      if (campo === "fecha") {
        const fecha = parseFechaCelda(cell.value, cell.text);
        if (fecha) fila.fecha = fecha;
        return;
      }
      if (CAMPOS_NUMERICOS.has(campo)) {
        const n = parseNumeroCelda(cell.value, cell.text);
        if (n != null) fila[campo] = n;
        return;
      }
      if (CAMPOS_TEXTO.has(campo)) {
        const texto = cell.text?.trim();
        if (texto) fila[campo] = texto;
      }
    });
    if (!fila.cliente_nombre || fila.monto == null) {
      omitidas += 1;
      return;
    }
    if (fila.descuento_mp == null) fila.descuento_mp = 0;
    filas.push(fila);
  });

  if (filas.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron filas válidas (falta Cliente o Monto)" },
      { status: 400 }
    );
  }

  // Para no duplicar: si ya existe un pago con la misma fecha, cliente y
  // monto, lo salteamos en vez de cargarlo de nuevo.
  const { data: existentes, error: errorExistentes } = await supabase
    .from("pagos")
    .select("fecha, cliente_nombre, monto");

  if (errorExistentes) {
    return NextResponse.json({ error: errorExistentes.message }, { status: 500 });
  }

  const claveDe = (p: { fecha?: string; cliente_nombre: string; monto: number }) =>
    `${p.fecha ?? ""}|${p.cliente_nombre.toString().trim().toLowerCase()}|${p.monto}`;

  const clavesExistentes = new Set((existentes ?? []).map((p) => claveDe(p)));

  const nuevasFilas = filas.filter((f) => {
    const fila = f as { fecha?: string; cliente_nombre: string; monto: number };
    return !clavesExistentes.has(claveDe(fila));
  });
  const duplicadas = filas.length - nuevasFilas.length;

  let insertados: { id: string }[] | null = [];
  if (nuevasFilas.length > 0) {
    const { data, error } = await supabase.from("pagos").insert(nuevasFilas).select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    insertados = data;
  }

  return NextResponse.json({ inserted: insertados?.length ?? 0, omitidas, duplicadas });
}
