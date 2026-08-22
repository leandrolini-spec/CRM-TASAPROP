import { normalizarTelefonoIntl } from "@/lib/contact-links";

const BREVO_API_URL = "https://api.brevo.com/v3";
const REMITENTE = { name: "Tasaprop", email: "info@tasaprop.com" };

function apiKey() {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("Falta BREVO_API_KEY en las variables de entorno");
  return key;
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const REINTENTOS_429 = 4;

async function brevoFetch(path: string, init: RequestInit) {
  for (let intento = 0; intento <= REINTENTOS_429; intento++) {
    const res = await fetch(`${BREVO_API_URL}${path}`, {
      ...init,
      headers: {
        "api-key": apiKey(),
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
    });

    if (res.status === 429 && intento < REINTENTOS_429) {
      // Backoff exponencial: 300ms, 600ms, 1200ms, 2400ms.
      await esperar(300 * 2 ** intento);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo ${path} -> ${res.status}: ${body}`);
    }
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`Brevo ${path} -> 429: límite de velocidad, se agotaron los reintentos`);
}

export async function upsertContact(params: {
  email: string;
  inmobiliaria?: string | null;
  barrio?: string | null;
  telefono?: string | null;
}) {
  // WHATSAPP en Brevo exige formato internacional válido y rechaza el
  // pedido entero (también pisa INMOBILIARIA/BARRIO) si el valor no cumple
  // ese formato — por eso solo lo mandamos cuando pudimos normalizarlo.
  const whatsappIntl = normalizarTelefonoIntl(params.telefono ?? null);

  return brevoFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      updateEnabled: true,
      attributes: {
        INMOBILIARIA: params.inmobiliaria ?? undefined,
        BARRIO: params.barrio ?? undefined,
        TELEFONO: params.telefono ?? undefined,
        ...(whatsappIntl ? { WHATSAPP: `+${whatsappIntl}` } : {}),
      },
    }),
  });
}

export async function getTemplates() {
  return brevoFetch("/smtp/templates?templateStatus=true&limit=100&sort=desc", {
    method: "GET",
  });
}

// Una llamada por destinatario: si mandáramos varios en el mismo "to" de
// Brevo, cada inmobiliaria vería el email de las demás.
export async function sendTemplate(params: {
  templateId: number;
  to: string;
  name?: string | null;
}) {
  return brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      templateId: params.templateId,
      to: [{ email: params.to, name: params.name ?? undefined }],
    }),
  });
}

export async function getLists() {
  return brevoFetch("/contacts/lists?limit=50&sort=desc", { method: "GET" });
}

export async function addContactsToList(listId: number, emails: string[]) {
  return brevoFetch(`/contacts/lists/${listId}/contacts/add`, {
    method: "POST",
    body: JSON.stringify({ emails }),
  });
}

export async function getCampaigns() {
  return brevoFetch(
    "/emailCampaigns?statistics=globalStats&sort=desc&limit=25",
    { method: "GET" }
  );
}

export async function getCampaignDetail(id: number) {
  return brevoFetch(`/emailCampaigns/${id}`, { method: "GET" });
}

export async function getListContacts(listId: number) {
  return brevoFetch(`/contacts/lists/${listId}/contacts?limit=500`, {
    method: "GET",
  });
}

export async function getContactWithStats(email: string) {
  return brevoFetch(`/contacts/${encodeURIComponent(email)}`, {
    method: "GET",
  });
}

export async function sendCampaignEmail(params: {
  to: string;
  inmobiliaria: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}) {
  return brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: REMITENTE,
      to: [{ email: params.to, name: params.inmobiliaria }],
      subject: params.subject,
      htmlContent: params.html,
      textContent: params.text,
      headers: {
        // Header de baja de un clic (RFC 8058) — lo exigen Gmail/Yahoo para
        // remitentes masivos desde 2024. Sin esto, aunque el dominio esté
        // bien autenticado, es mucho más probable terminar en spam.
        "List-Unsubscribe": `<${params.unsubscribeUrl}>, <mailto:info@tasaprop.com?subject=Baja>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
}
