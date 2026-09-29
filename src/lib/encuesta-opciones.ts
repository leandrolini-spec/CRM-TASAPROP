export const FRECUENCIA_OPCIONES = [
  { valor: "nunca", texto: "Nunca llegué a usarla" },
  { valor: "una_vez", texto: "La probé una sola vez" },
  { valor: "a_veces", texto: "La uso de vez en cuando" },
  { valor: "seguido", texto: "La uso seguido" },
];

export const MOTIVO_OPCIONES = [
  { valor: "precio", texto: "El precio no me cerró" },
  { valor: "tasacion", texto: "La tasación no coincidió con lo que esperaba del mercado" },
  { valor: "no_entendi", texto: "No entendí bien cómo usarla o leer el resultado" },
  { valor: "tecnico", texto: "Problemas técnicos (errores, lentitud)" },
  { valor: "faltan_funciones", texto: "Me faltó alguna función que necesito" },
  { valor: "sin_motivo", texto: "Nada en particular, simplemente no volví a usarla" },
  { valor: "sin_quejas", texto: "Ningún problema, todo bien" },
  { valor: "otro", texto: "Otro" },
];

export const PRECIO_OPCIONES = [
  { valor: "caro", texto: "Caro" },
  { valor: "justo", texto: "Justo" },
  { valor: "barato", texto: "Barato" },
];

export const TASACION_OPCIONES = [
  { valor: "cerca", texto: "Sí, bastante cerca" },
  { valor: "mas_o_menos", texto: "Más o menos" },
  { valor: "lejos", texto: "No, estuvo lejos" },
  { valor: "no_compare", texto: "No llegué a comparar" },
];

function textoDe(opciones: { valor: string; texto: string }[], valor: string) {
  return opciones.find((o) => o.valor === valor)?.texto ?? valor;
}

export function textoFrecuencia(valor: string) {
  return textoDe(FRECUENCIA_OPCIONES, valor);
}
export function textoMotivo(valor: string) {
  return textoDe(MOTIVO_OPCIONES, valor);
}
export function textoPrecio(valor: string) {
  return textoDe(PRECIO_OPCIONES, valor);
}
export function textoTasacion(valor: string) {
  return textoDe(TASACION_OPCIONES, valor);
}
