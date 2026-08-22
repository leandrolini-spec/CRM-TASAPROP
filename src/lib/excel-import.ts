export function normalizarEncabezado(s: string) {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function parseFechaCelda(valor: unknown, texto: string | undefined): string | null {
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }
  const t = texto?.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export function parseNumeroCelda(valor: unknown, texto: string | undefined): number | null {
  if (typeof valor === "number") return valor;
  const t = texto?.trim();
  if (!t) return null;

  let limpio = t.replace(/[^\d.,-]/g, "");
  const tieneComa = limpio.includes(",");
  const tienePunto = limpio.includes(".");

  if (tieneComa && tienePunto) {
    // Formato AR: "." separa miles, "," son los decimales.
    limpio = limpio.replace(/\./g, "").replace(",", ".");
  } else if (tieneComa) {
    // Solo coma: es el separador decimal.
    limpio = limpio.replace(",", ".");
  } else if (tienePunto) {
    // Solo puntos: si separan grupos de 3 dígitos son miles (ej. "30.000"),
    // si no, es un decimal suelto (ej. "30.5").
    const partes = limpio.split(".");
    const sonMiles = partes.length > 1 && partes.slice(1).every((p) => p.length === 3);
    if (sonMiles) limpio = partes.join("");
  }

  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}
