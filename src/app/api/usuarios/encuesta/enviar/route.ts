import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import {
  sendEncuestaEmail,
  upsertContact,
  addContactsToList,
  getLists,
  createList,
} from "@/lib/brevo/client";

const ASUNTO = "¿Nos contás qué te pareció TasaProp?";
const LISTA_NOMBRE = "Usuarios App";
const FOLDER_ID = 1; // "Your first folder" — donde ya vive la lista INMOBILIARIAS.

async function idListaUsuariosApp(): Promise<number> {
  const listas = (await getLists()) as { lists: { id: number; name: string }[] };
  const existente = listas.lists.find((l) => l.name === LISTA_NOMBRE);
  if (existente) return existente.id;
  const creada = (await createList(LISTA_NOMBRE, FOLDER_ID)) as { id: number };
  return creada.id;
}

export async function POST(req: NextRequest) {
  const { ids } = (await req.json()) as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Sin usuarios seleccionados" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: usuarios, error: usuariosError } = await supabase
    .from("usuarios_app")
    .select("id, nombre, email, baja")
    .in("id", ids);

  if (usuariosError) {
    return NextResponse.json({ error: usuariosError.message }, { status: 500 });
  }
  const destinatarios = (usuarios ?? []).filter((u) => !u.baja);
  if (destinatarios.length === 0) {
    return NextResponse.json({ error: "Ninguno de los seleccionados puede recibir el mail (baja)" }, { status: 400 });
  }

  const htmlTemplate = await readFile(
    path.join(process.cwd(), "src/lib/brevo/plantilla-encuesta.html"),
    "utf-8"
  );
  const textTemplate = await readFile(
    path.join(process.cwd(), "src/lib/brevo/plantilla-encuesta.txt"),
    "utf-8"
  );

  const listaId = await idListaUsuariosApp();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200";

  const enviadosOk: string[] = [];
  const fallidos: { email: string; error: string }[] = [];

  for (const usuario of destinatarios) {
    try {
      await upsertContact({ email: usuario.email });
      await addContactsToList(listaId, [usuario.email]);

      const unsubscribeUrl = `${siteUrl}/baja?email=${encodeURIComponent(usuario.email)}`;
      const encuestaUrl = `${siteUrl}/encuesta?email=${encodeURIComponent(usuario.email)}`;
      const primerNombre = usuario.nombre ? usuario.nombre.split(" ")[0] : null;
      const saludo = primerNombre ? `, ${primerNombre}` : "";

      await sendEncuestaEmail({
        to: usuario.email,
        nombre: usuario.nombre,
        subject: ASUNTO,
        html: htmlTemplate
          .replaceAll("{{NOMBRE_SALUDO}}", saludo)
          .replaceAll("{{ENCUESTA_URL}}", encuestaUrl)
          .replaceAll("{{UNSUB_URL}}", unsubscribeUrl),
        text: textTemplate
          .replaceAll("{NOMBRE_SALUDO}", saludo)
          .replaceAll("{ENCUESTA_URL}", encuestaUrl)
          .replaceAll("{UNSUB_URL}", unsubscribeUrl),
        unsubscribeUrl,
      });

      await supabase
        .from("usuarios_app")
        .update({ encuesta_enviada_at: new Date().toISOString() })
        .eq("id", usuario.id);

      enviadosOk.push(usuario.email);
    } catch (err) {
      fallidos.push({
        email: usuario.email,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return NextResponse.json({ enviados: enviadosOk.length, fallidos });
}
