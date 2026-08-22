/** Formatea una fecha ISO ("YYYY-MM-DD") como "D/M/AA" (año a 2 dígitos, sin ceros a la izquierda). */
export function formatFechaCorta(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  if (!anio || !mes || !dia) return fechaISO;
  return `${dia}/${mes}/${String(anio).slice(-2)}`;
}
