// Normaliza a dígitos con código de país (54...), sin "+". Devuelve null si
// el texto no tiene ningún número aprovechable como WhatsApp.
export function normalizarTelefonoIntl(telefono: string | null): string | null {
  if (!telefono) return null;
  // Números fuera de Argentina (ej. "+1 (347) 277-2265") no los adivinamos.
  if (telefono.includes("(")) return null;

  // Cuando hay varios números separados por "/" (ej. "4571-1250 / WhatsApp
  // 11 7831-2004"), preferimos el que dice explícitamente "WhatsApp" en vez
  // de quedarnos siempre con el primero, que suele ser un fijo.
  const partes = telefono.split("/").map((p) => p.trim());
  const preferida = partes.find((p) => /whatsapp/i.test(p)) ?? partes[0];

  let digits = preferida.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("15")) digits = digits.slice(2);
  if (!digits.startsWith("54")) digits = `54${digits}`;

  // Un celular argentino con código de área queda en 12-13 dígitos
  // (54 + área + número). Si da más corto es un fijo sin área — no hay
  // forma de saber si tiene WhatsApp, así que no lo mandamos.
  if (digits.length < 12 || digits.length > 13) return null;

  return digits;
}

export function whatsappLink(telefono: string | null): string | null {
  const digits = normalizarTelefonoIntl(telefono);
  return digits ? `https://wa.me/${digits}` : null;
}

export function mailtoLink(email: string | null, firma?: string | null): string | null {
  if (!email) return null;
  if (!firma || !firma.trim()) return `mailto:${email}`;
  // Dos saltos de línea antes de la firma para dejar espacio al mensaje.
  const body = `\n\n${firma}`;
  return `mailto:${email}?body=${encodeURIComponent(body)}`;
}

export function instagramLink(instagram: string | null): string | null {
  if (!instagram) return null;
  if (instagram.startsWith("http")) return instagram;
  const handle = instagram.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

export function webLink(web: string | null): string | null {
  if (!web) return null;
  if (web.startsWith("http")) return web;
  return `https://${web}`;
}
