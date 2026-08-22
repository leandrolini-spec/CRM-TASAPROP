import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { normalizarEncabezado } from "@/lib/excel-import";
import { upsertContact } from "@/lib/brevo/client";

const MAX_SIZE = 10 * 1024 * 1024;

const MAPA_CAMPOS: Record<string, string> = {
  inmobiliaria: "inmobiliaria",
  localidad: "barrio",
  barrio: "barrio",
  telefono: "telefono",
  "telefono/whatsapp": "telefono",
  whatsapp: "telefono",
  email: "email",
  "e-mail": "email",
  instagram: "instagram",
  web: "web",
  sitio: "web",
  fuente: "fuente",
  notas: "notas",
};

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

  const filas: Record<string, string>[] = [];
  let omitidas = 0;
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const fila: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const campo = columnas[colNumber];
      if (!campo) return;
      const valor = cell.text?.trim();
      if (valor) fila[campo] = valor;
    });
    if (!fila.inmobiliaria) {
      omitidas += 1;
      return;
    }
    filas.push(fila);
  });

  if (filas.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron filas válidas (falta la columna Inmobiliaria)" },
      { status: 400 }
    );
  }

  // Para no duplicar: si el email o el nombre de inmobiliaria ya existen,
  // actualizamos ese contacto en vez de crear uno nuevo.
  const { data: existentes, error: errorExistentes } = await supabase
    .from("contactos")
    .select("id, email, inmobiliaria");

  if (errorExistentes) {
    return NextResponse.json({ error: errorExistentes.message }, { status: 500 });
  }

  const porEmail = new Map<string, string>();
  const porNombre = new Map<string, string>();
  for (const c of existentes ?? []) {
    if (c.email) porEmail.set(c.email.toLowerCase(), c.id);
    porNombre.set(c.inmobiliaria.toLowerCase(), c.id);
  }

  let creados = 0;
  let actualizados = 0;

  for (const fila of filas) {
    const idExistente =
      (fila.email && porEmail.get(fila.email.toLowerCase())) ||
      porNombre.get(fila.inmobiliaria.toLowerCase());

    const datos = {
      inmobiliaria: fila.inmobiliaria,
      barrio: fila.barrio ?? null,
      telefono: fila.telefono ?? null,
      email: fila.email ?? null,
      instagram: fila.instagram ?? null,
      web: fila.web ?? null,
      fuente: fila.fuente ?? null,
      notas: fila.notas ?? null,
    };

    if (idExistente) {
      // Solo pisamos con valores que vinieron en la planilla, para no
      // borrar datos que ya estaban cargados y esta fila no trae.
      const parcial = Object.fromEntries(
        Object.entries(datos).filter(([, v]) => v !== null)
      );
      await supabase.from("contactos").update(parcial).eq("id", idExistente);
      actualizados += 1;
    } else {
      const { data: nuevo } = await supabase
        .from("contactos")
        .insert(datos)
        .select("id")
        .single();
      if (nuevo) {
        if (fila.email) porEmail.set(fila.email.toLowerCase(), nuevo.id);
        porNombre.set(fila.inmobiliaria.toLowerCase(), nuevo.id);
      }
      creados += 1;
    }
  }

  // Best-effort: si Brevo falla para alguna fila no bloqueamos la importación.
  await Promise.allSettled(
    filas
      .filter((f) => f.email)
      .map((f) =>
        upsertContact({
          email: f.email,
          inmobiliaria: f.inmobiliaria,
          barrio: f.barrio ?? null,
          telefono: f.telefono ?? null,
        })
      )
  );

  return NextResponse.json({ inserted: creados, actualizados, omitidas });
}
