import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { normalizarEncabezado, parseFechaCelda, parseNumeroCelda } from "@/lib/excel-import";

const MAX_SIZE = 10 * 1024 * 1024;

const MAPA_CAMPOS: Record<string, string> = {
  fecha: "fecha",
  descripcion: "descripcion",
  categoria: "categoria",
  moneda: "moneda",
  monto: "monto",
  notas: "notas",
};

const CATEGORIAS = [
  "Marketing y difusión",
  "Software y herramientas",
  "Oficina",
  "Impuestos",
  "Comisiones bancarias",
  "Sueldos y honorarios",
  "Otro",
];
const CATEGORIAS_NORMALIZADAS = new Map(
  CATEGORIAS.map((c) => [normalizarEncabezado(c), c])
);

function normalizarCategoria(texto: string | undefined): string {
  if (!texto) return "Otro";
  return CATEGORIAS_NORMALIZADAS.get(normalizarEncabezado(texto)) ?? "Otro";
}

function normalizarMoneda(texto: string | undefined): "ARS" | "USD" {
  if (!texto) return "ARS";
  const t = normalizarEncabezado(texto);
  return t.includes("usd") || t.includes("dolar") || t.includes("u$s") ? "USD" : "ARS";
}

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
      if (campo === "monto") {
        const n = parseNumeroCelda(cell.value, cell.text);
        if (n != null) fila.monto = n;
        return;
      }
      if (campo === "categoria") {
        fila.categoria = normalizarCategoria(cell.text?.trim());
        return;
      }
      if (campo === "moneda") {
        fila.moneda = normalizarMoneda(cell.text?.trim());
        return;
      }
      const texto = cell.text?.trim();
      if (texto) fila[campo] = texto;
    });
    if (!fila.descripcion || fila.monto == null) {
      omitidas += 1;
      return;
    }
    if (fila.categoria == null) fila.categoria = "Otro";
    if (fila.moneda == null) fila.moneda = "ARS";
    filas.push(fila);
  });

  if (filas.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron filas válidas (falta Descripción o Monto)" },
      { status: 400 }
    );
  }

  // Para no duplicar: si ya existe un gasto con la misma fecha, descripción,
  // monto y moneda, lo salteamos en vez de cargarlo de nuevo.
  const { data: existentes, error: errorExistentes } = await supabase
    .from("gastos")
    .select("fecha, descripcion, monto, moneda");

  if (errorExistentes) {
    return NextResponse.json({ error: errorExistentes.message }, { status: 500 });
  }

  const claveDe = (f: { fecha?: string; descripcion: string; monto: number; moneda: string }) =>
    `${f.fecha ?? ""}|${f.descripcion.toString().trim().toLowerCase()}|${f.monto}|${f.moneda}`;

  const clavesExistentes = new Set((existentes ?? []).map((g) => claveDe(g)));

  const nuevasFilas = filas.filter((f) => {
    const fila = f as { fecha?: string; descripcion: string; monto: number; moneda: string };
    return !clavesExistentes.has(claveDe(fila));
  });
  const duplicadas = filas.length - nuevasFilas.length;

  let insertados: { id: string }[] | null = [];
  if (nuevasFilas.length > 0) {
    const { data, error } = await supabase.from("gastos").insert(nuevasFilas).select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    insertados = data;
  }

  return NextResponse.json({ inserted: insertados?.length ?? 0, omitidas, duplicadas });
}
