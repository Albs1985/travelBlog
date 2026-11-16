/**
 * Catálogos de la web: iconos y normalización de textos.
 * Aquí se añade un transporte / categoría / tipo de alojamiento nuevo (y su icono).
 */

const ICONOS = 'assets/icons/';

/** Valor de "transporte" en el JSON del viaje  ->  archivo del icono */
const TRANSPORTE_ICONO: Record<string, string> = {
  Autobus: 'autobus.png',
  Avion: 'avion.png',
  Barco: 'barco-grande.png',
  Barca: 'barca.png',
  Bicicleta: 'bicicleta.png',
  Coche: 'coche.png',
  Moto: 'moto.png',
  Tren: 'tren.png',
  Furgoneta: 'camper.png',
  Caravana: 'caravana.png',
  FoodTruck: 'foodTruck.png',
  Boda: 'boda.png',
};

/** Categoría del viaje  ->  slug (el que se usa en la URL /viajesFiltrados/:slug y en las claves i18n) */
const CATEGORIA_SLUG: Record<string, string> = {
  Playa: 'playa',
  Montaña: 'montanya',
  Ciudad: 'ciudad',
  Nieve: 'nieve',
};

/** Tipo de alojamiento  ->  icono (solo los que tienen) */
const ALOJAMIENTO_ICONO: Record<string, string> = {
  Cabaña: 'cabanya.png',
  Albergue: 'albergue.png',
  Airbnb: 'airbnb.png',
};

export const CATEGORIAS_SLUG = Object.values(CATEGORIA_SLUG);

export function iconoTransporte(transporte: string): string {
  const f = TRANSPORTE_ICONO[transporte];
  return f ? ICONOS + f : '';
}

export function slugCategoria(categoria: string): string {
  return CATEGORIA_SLUG[categoria] ?? '';
}

export function iconoCategoria(categoriaOSlug: string): string {
  const slug = CATEGORIA_SLUG[categoriaOSlug] ?? (CATEGORIAS_SLUG.includes(categoriaOSlug) ? categoriaOSlug : '');
  return slug ? `${ICONOS}${slug}.png` : '';
}

export function iconoAlojamiento(tipo: string): string {
  const f = ALOJAMIENTO_ICONO[tipo];
  return f ? ICONOS + f : '';
}

/** Minúsculas y sin acentos, para buscar sin que importe cómo se escriba. */
export function normalizar(texto: string): string {
  return (texto ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
