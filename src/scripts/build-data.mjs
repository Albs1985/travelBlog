#!/usr/bin/env node
/**
 * GENERADOR DE DATOS
 * ------------------
 * Lee   content/            (lo único que se escribe a mano: viajes, relatos, frases, dibujos, recetas...)
 *       src/assets/images/  (las fotos: se descubren solas por su nombre)
 * Crea  src/assets/data/generated/*.json   (lo que lee la web)
 *
 * Calcula automáticamente todo lo que se pueda: año, portadas, nº de fotos, viaje anterior/siguiente,
 * fotos sin colocar, extensiones de las imágenes (.jpg/.jpeg/.JPG...), ids...
 *
 * Se ejecuta solo con `npm start` y `npm run build`. A mano: `npm run datos`
 * Opción --strict: los avisos se tratan como errores (útil en integración continua).
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SALIDA, Reporte } from './lib/comun.mjs';
import { construirViajes } from './lib/viajes.mjs';
import { construirRelatos } from './lib/relatos.mjs';
import { construirFrases, construirDibujos, construirFavoritos, construirRecetas, construirPreguntas, construirViajeros } from './lib/colecciones.mjs';

const STRICT = process.argv.includes('--strict');
const reporte = new Reporte();

// Cada generador devuelve { archivos: { 'ruta/relativa.json': objeto }, resumen: 'texto' }
const viajes = construirViajes(reporte);
const generadores = [
  {
    archivos: {
      'index.json': { anyos: viajes.anyos, viajes: viajes.resumenes },
      ...Object.fromEntries(viajes.detalles.map((d) => [`viajes/${d.archivo}.json`, d])),
    },
    resumen: `${viajes.resumenes.length} viajes, ${viajes.anyos.length} años, ${viajes.resumenes.reduce((s, v) => s + v.numFotos, 0)} fotos`,
  },
  construirRelatos(reporte),
  construirFrases(reporte),
  construirDibujos(reporte),
  construirFavoritos(reporte),
  construirRecetas(reporte),
  construirPreguntas(reporte),
  construirViajeros(reporte),
];

for (const e of reporte.avisos) console.warn(`⚠  ${e}`);
if (reporte.errores.length || (STRICT && reporte.avisos.length)) {
  for (const e of reporte.errores) console.error(`✖  ${e}`);
  console.error(`\nNo se han generado los datos (${reporte.errores.length} errores${STRICT ? `, ${reporte.avisos.length} avisos` : ''}).`);
  process.exit(1);
}

rmSync(SALIDA, { recursive: true, force: true });
for (const g of generadores) {
  for (const [ruta, contenido] of Object.entries(g.archivos)) {
    const destino = join(SALIDA, ruta);
    mkdirSync(join(destino, '..'), { recursive: true });
    writeFileSync(destino, JSON.stringify(contenido));
  }
}
console.log(`✔ ${generadores.map((g) => g.resumen).join(' · ')}\n  → src/assets/data/generated/`);
