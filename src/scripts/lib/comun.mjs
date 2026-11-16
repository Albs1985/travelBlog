/**
 * Utilidades comunes de los scripts de datos.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENIDO = join(RAIZ, 'content');
export const IMAGENES = join(RAIZ, 'src', 'assets', 'images');
export const SALIDA = join(RAIZ, 'src', 'assets', 'data', 'generated');

/** Idiomas de la web. Para añadir uno nuevo: ponerlo aquí y escribir su clave (p. ej. "en") en los textos. */
export const IDIOMAS = ['es', 'val'];
export const EXTENSIONES = 'jpe?g|png|webp|avif|gif';
export const TIPOS_BLOQUE = ['titulo', 'subtitulo', 'parrafo', 'nota', 'cita', 'foto', 'mapa', 'lista'];

export const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const slug = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Errores (impiden generar) y avisos (solo se muestran). */
export class Reporte {
  errores = [];
  avisos = [];
  error(donde, msg) { this.errores.push(`${donde}: ${msg}`); }
  aviso(donde, msg) { this.avisos.push(`${donde}: ${msg}`); }
}

/** Convierte un texto (cadena u objeto con claves de idioma) en {es, val}; null si está vacío. */
export function texto(origen) {
  if (origen == null) return null;
  if (typeof origen === 'string') {
    return origen.trim() ? Object.fromEntries(IDIOMAS.map((l) => [l, origen])) : null;
  }
  const salida = {};
  for (const l of IDIOMAS) if (typeof origen[l] === 'string' && origen[l].trim()) salida[l] = origen[l];
  return Object.keys(salida).length ? salida : null;
}

const listados = new Map();
/** Archivos de una carpeta de assets/images (con caché). */
export function listar(carpeta) {
  if (!listados.has(carpeta)) {
    const ruta = join(IMAGENES, carpeta);
    listados.set(carpeta, existsSync(ruta) ? readdirSync(ruta) : []);
  }
  return listados.get(carpeta);
}

export const existeImagen = (rutaRelativa) => existsSync(join(IMAGENES, rutaRelativa));

/**
 * Busca las fotos numeradas de una carpeta: <prefijo>1.jpg, <prefijo>2.jpeg, ...
 * Devuelve Map(numero -> nombre de archivo real). Cualquier extensión y mayúsculas/minúsculas.
 */
export function fotosNumeradas(carpeta, prefijo, donde, reporte) {
  const mapa = new Map();
  const re = new RegExp(`^${escapar(prefijo)}(\\d+)\\.(${EXTENSIONES})$`, 'i');
  for (const f of listar(carpeta).slice().sort()) {
    const m = f.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (mapa.has(n)) reporte.aviso(donde, `hay dos fotos con el número ${n} (${mapa.get(n)} y ${f}); se usa ${mapa.get(n)}`);
    else mapa.set(n, f);
  }
  return mapa;
}

/** Lee un JSON; si está roto lo anota como error y devuelve undefined. */
export function leerJson(ruta, nombre, reporte) {
  try {
    return JSON.parse(readFileSync(ruta, 'utf8'));
  } catch (e) {
    reporte.error(nombre, e.code === 'ENOENT' ? 'no existe el archivo' : `JSON no válido (${e.message})`);
    return undefined;
  }
}

/**
 * Valida y normaliza una lista de bloques de contenido (viajes y relatos).
 *  - agrupa las fotos consecutivas en una rejilla {tipo:'fotos'}
 *  - resuelve las fotos: por `src` (ruta dentro de assets/images) o por `n` (foto numerada del viaje)
 * ctx: { archivo, reporte, porNumero?: Map, rutaNumerada?: (nombre)=>ruta, hayMapa: boolean, usadas?: Set }
 */
export function procesarBloques(bloques, ctx) {
  const { archivo, reporte } = ctx;
  const salida = [];
  (bloques || []).forEach((b, k) => {
    if (b.oculto) return; // bloque desactivado a propósito: se conserva en el archivo pero no se publica
    if (!TIPOS_BLOQUE.includes(b.tipo)) {
      return reporte.error(archivo, `bloque #${k + 1}: tipo "${b.tipo}" desconocido (válidos: ${TIPOS_BLOQUE.join(', ')})`);
    }
    if (b.tipo === 'mapa') {
      if (!ctx.hayMapa) return reporte.aviso(archivo, `bloque #${k + 1}: hay un bloque "mapa" pero no hay campo "mapa"`);
      return salida.push({ tipo: 'mapa' });
    }
    if (b.tipo === 'foto') {
      let src = '';
      if (b.src) {
        if (!existeImagen(b.src)) return reporte.aviso(archivo, `bloque #${k + 1}: la foto ${b.src} no existe en assets/images/ (se omite)`);
        src = b.src;
      } else if (b.n != null && ctx.porNumero) {
        const f = ctx.porNumero.get(Number(b.n));
        if (!f) return reporte.aviso(archivo, `bloque #${k + 1}: la foto ${b.n} no existe en la carpeta de fotos (se omite)`);
        ctx.usadas?.add(Number(b.n));
        src = ctx.rutaNumerada(f);
      } else {
        return reporte.error(archivo, `bloque #${k + 1}: una "foto" necesita "n" (nº de foto del viaje) o "src" (ruta en assets/images)`);
      }
      const item = { src };
      const desc = texto(b.desc ?? b);
      if (desc) item.desc = desc;
      const ultimo = salida[salida.length - 1];
      if (ultimo && ultimo.tipo === 'fotos') ultimo.fotos.push(item);
      else salida.push({ tipo: 'fotos', fotos: [item] });
      return;
    }
    if (b.tipo === 'lista') {
      const items = (b.items || []).map(texto).filter(Boolean);
      if (!items.length) return reporte.aviso(archivo, `bloque #${k + 1} (lista): sin elementos, se omite`);
      const bloque = { tipo: 'lista', items };
      const titulo = texto(b.titulo);
      if (titulo) bloque.titulo = titulo;
      return salida.push(bloque);
    }
    const t = texto(b.texto ?? b);
    if (!t) return reporte.aviso(archivo, `bloque #${k + 1} (${b.tipo}): sin texto, se omite`);
    const bloque = { tipo: b.tipo, texto: t };
    if (b.tipo === 'cita') {
      const autor = texto(b.autor);
      if (autor) bloque.autor = autor;
    }
    salida.push(bloque);
  });
  return salida;
}
