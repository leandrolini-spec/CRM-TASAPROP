import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { createClient } from "@/lib/supabase/server";

// Primera vez que se conecta una casilla: no traer todo el historial,
// solo lo de los últimos días para no inundar de notificaciones viejas.
const VENTANA_INICIAL_MS = 3 * 24 * 60 * 60 * 1000;
const ESPERA_TRAS_ERROR_MIN = 5;
const MAX_CUERPO_CHARS = 3000;

type NodoEstructura = {
  type?: string;
  childNodes?: NodoEstructura[];
};

// Busca la parte de texto (preferimos texto plano, si no hay usamos html)
// en la estructura del mensaje. Solo mira un nivel de multipart, que cubre
// la gran mayoría de mails reales.
function encontrarParteTexto(
  estructura: NodoEstructura | undefined
): { parte: string; html: boolean } | null {
  if (!estructura) return null;
  if (!estructura.childNodes || estructura.childNodes.length === 0) {
    if (estructura.type === "text/plain") return { parte: "1", html: false };
    if (estructura.type === "text/html") return { parte: "1", html: true };
    return null;
  }
  let candidatoHtml: string | null = null;
  for (let i = 0; i < estructura.childNodes.length; i++) {
    const nodo = estructura.childNodes[i];
    const parte = `${i + 1}`;
    if (nodo.type === "text/plain") return { parte, html: false };
    if (nodo.type === "text/html" && !candidatoHtml) candidatoHtml = parte;
  }
  return candidatoHtml ? { parte: candidatoHtml, html: true } : null;
}

function limpiarHtml(texto: string) {
  return texto
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extraerCuerpo(
  client: ImapFlow,
  uid: number,
  estructura: NodoEstructura | undefined
): Promise<string | null> {
  const encontrado = encontrarParteTexto(estructura);
  if (!encontrado) return null;
  try {
    const { content, meta } = await client.download(String(uid), encontrado.parte, {
      uid: true,
      maxBytes: 20000,
    });
    if (!content) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of content as AsyncIterable<Buffer>) chunks.push(chunk);
    let texto = Buffer.concat(chunks).toString("utf-8");
    if (encontrado.html || meta?.contentType?.includes("html")) {
      texto = limpiarHtml(texto);
    }
    return texto.slice(0, MAX_CUERPO_CHARS) || null;
  } catch {
    return null;
  }
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: config } = await supabase
    .from("mail_config")
    .select(
      "imap_host, imap_port, imap_user, imap_password, last_checked_at, last_error, last_attempt_at"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!config) {
    return NextResponse.json({ configured: false, nuevas: 0 });
  }

  // Si el último intento falló, no lo reintentamos en cada carga de página
  // (eso es lo que generaba el delay general del sistema) — esperamos unos
  // minutos antes de volver a intentar la conexión. Usamos last_attempt_at
  // (no last_checked_at) para no correr la ventana de búsqueda de mails
  // nuevos cuando finalmente se corrija la contraseña.
  if (config.last_error && config.last_attempt_at) {
    const minutosDesdeUltimoIntento =
      (Date.now() - new Date(config.last_attempt_at).getTime()) / 60000;
    if (minutosDesdeUltimoIntento < ESPERA_TRAS_ERROR_MIN) {
      return NextResponse.json({ configured: true, error: config.last_error, nuevas: 0 });
    }
  }

  const desde = config.last_checked_at
    ? new Date(config.last_checked_at)
    : new Date(Date.now() - VENTANA_INICIAL_MS);

  const client = new ImapFlow({
    host: config.imap_host,
    port: config.imap_port,
    secure: config.imap_port === 993,
    auth: { user: config.imap_user, pass: config.imap_password },
    logger: false,
    // Antes esto podía tardar 7+ segundos en fallar y frenaba el resto del
    // sitio (el navegador tiene un límite de conexiones simultáneas por
    // dominio). Con esto, si la casilla no responde o la contraseña está
    // mal, falla rápido en vez de colgar la página.
    connectionTimeout: 4000,
    greetingTimeout: 3000,
    socketTimeout: 5000,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({ since: desde }, { uid: true });
      let nuevas = 0;

      if (uids && uids.length > 0) {
        const filas: {
          profile_id: string;
          message_id: string;
          de: string | null;
          asunto: string | null;
          recibido_en: string | null;
          cuerpo: string | null;
        }[] = [];

        // Primero recolectamos todos los mensajes (sin cerrar el iterator no
        // se puede abrir otro comando en la misma conexión), y recién
        // después, uno por uno, pedimos el cuerpo de cada uno.
        const mensajes: {
          uid: number;
          messageId: string | undefined;
          de: string | null;
          asunto: string | undefined;
          fecha: Date | undefined;
          bodyStructure: NodoEstructura | undefined;
        }[] = [];

        for await (const msg of client.fetch(
          uids,
          { envelope: true, bodyStructure: true },
          { uid: true }
        )) {
          const remitente = msg.envelope?.from?.[0];
          const de = remitente
            ? remitente.name
              ? `${remitente.name} <${remitente.address}>`
              : (remitente.address ?? null)
            : null;
          mensajes.push({
            uid: msg.uid,
            messageId: msg.envelope?.messageId,
            de,
            asunto: msg.envelope?.subject,
            fecha: msg.envelope?.date,
            bodyStructure: msg.bodyStructure as NodoEstructura | undefined,
          });
        }

        for (const m of mensajes) {
          const cuerpo = await extraerCuerpo(client, m.uid, m.bodyStructure);
          filas.push({
            profile_id: user.id,
            message_id: m.messageId ?? `uid-${m.uid}`,
            de: m.de,
            asunto: m.asunto ?? null,
            recibido_en: m.fecha ? new Date(m.fecha).toISOString() : null,
            cuerpo,
          });
        }

        if (filas.length > 0) {
          const { data: insertadas } = await supabase
            .from("notificaciones_email")
            .upsert(filas, { onConflict: "profile_id,message_id", ignoreDuplicates: true })
            .select("id");
          nuevas = insertadas?.length ?? 0;
        }
      }

      const ahora = new Date().toISOString();
      await supabase
        .from("mail_config")
        .update({ last_checked_at: ahora, last_attempt_at: ahora, last_error: null })
        .eq("profile_id", user.id);

      return NextResponse.json({ configured: true, nuevas });
    } finally {
      lock.release();
    }
  } catch (err) {
    const detalle =
      err && typeof err === "object"
        ? ((err as { responseText?: string; response?: string }).responseText ??
          (err as { responseText?: string; response?: string }).response)
        : undefined;
    const base = err instanceof Error ? err.message : String(err);
    const mensaje = detalle && detalle !== base ? `${base}: ${detalle}` : base;
    await supabase
      .from("mail_config")
      .update({ last_error: mensaje, last_attempt_at: new Date().toISOString() })
      .eq("profile_id", user.id);
    return NextResponse.json({ configured: true, error: mensaje }, { status: 200 });
  } finally {
    await client.logout().catch(() => client.close());
  }
}
