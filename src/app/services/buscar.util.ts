import { Texto } from '../interfaces/viaje.interface';
import { normalizar } from './viajes.catalogo';

/** Todos los textos de un valor (cadena, {es, val}, lista...) en un solo texto normalizado para buscar. */
export function textoBuscable(...valores: unknown[]): string {
  const trozos: string[] = [];
  const recoger = (v: unknown): void => {
    if (v == null) return;
    if (typeof v === 'string' || typeof v === 'number') trozos.push(String(v));
    else if (Array.isArray(v)) v.forEach(recoger);
    else if (typeof v === 'object') Object.values(v as Texto).forEach(recoger);
  };
  valores.forEach(recoger);
  return normalizar(trozos.join(' | '));
}

/**
 * Filtra una lista por un término: sin importar mayúsculas ni acentos, y en todos los idiomas.
 * `campos` devuelve lo que se puede buscar de cada elemento (textos, listas, objetos {es, val}...).
 */
export function filtrar<T>(items: T[], termino: string, campos: (item: T) => unknown[]): T[] {
  const t = normalizar(termino);
  if (t === '') return items;
  return items.filter((i) => textoBuscable(...campos(i)).includes(t));
}

/** Edad en años cumplidos a partir de AAAA-MM-DD. */
export function calcularEdad(nacimiento: string): number {
  const diff = Math.abs(Date.now() - new Date(nacimiento).getTime());
  return Math.floor(diff / (1000 * 3600 * 24) / 365.25);
}
