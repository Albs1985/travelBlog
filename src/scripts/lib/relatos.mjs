/**
 * Relatos: content/relatos/<nombre>.json  ->  relatos/<nombre>.json
 * (la ruta de la web es /historias/<nombre>)
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENIDO, existeImagen, leerJson, procesarBloques, texto } from './comun.mjs';

export function construirRelatos(reporte) {
  const carpeta = join(CONTENIDO, 'relatos');
  const archivos = {};
  if (!existsSync(carpeta)) return { archivos, resumen: '0 relatos' };
  for (const nombre of readdirSync(carpeta).filter((f) => f.endsWith('.json')).sort()) {
    const slug = nombre.replace(/\.json$/, '');
    const r = leerJson(join(carpeta, nombre), `content/relatos/${nombre}`, reporte);
    if (!r) continue;
    const titulo = texto(r.titulo);
    if (!titulo) { reporte.error(nombre, 'falta "titulo"'); continue; }
    if (r.nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(r.nacimiento)) reporte.error(nombre, '"nacimiento" debe tener el formato AAAA-MM-DD');
    let portada;
    if (r.portada?.src) {
      if (existeImagen(r.portada.src)) portada = { src: r.portada.src, ...(texto(r.portada.desc) ? { desc: texto(r.portada.desc) } : {}) };
      else reporte.aviso(nombre, `la portada ${r.portada.src} no existe en assets/images/`);
    }
    const bloques = procesarBloques(r.bloques, { archivo: nombre, reporte, hayMapa: !!r.mapa });
    const salida = {
      slug,
      titulo,
      ...(texto(r.supra) ? { supra: texto(r.supra) } : {}),
      ...(texto(r.fecha) ? { fecha: texto(r.fecha) } : {}),
      icono: r.icono || '',
      ...(r.nacimiento ? { nacimiento: r.nacimiento } : {}),
      protegido: !!r.protegido,
      sinIdioma: !!r.sinIdioma,
      modoLibro: !!r.modoLibro,
      ...(r.siguiente ? { siguiente: r.siguiente } : {}),
      mapa: r.mapa || '',
      ...(portada ? { portada } : {}),
      bloques,
    };
    archivos[`relatos/${slug}.json`] = salida;
  }
  return { archivos, resumen: `${Object.keys(archivos).length} relatos` };
}
