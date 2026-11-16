#!/usr/bin/env node
/**
 * MIGRACIÓN (se ejecuta una sola vez)
 * -----------------------------------
 * Convierte el formato antiguo (viajes.json + fotos.json + textos en es.json / val.json)
 * al formato nuevo: UN archivo por viaje en content/viajes/, con los datos y los textos
 * de todos los idiomas juntos.
 *
 * Uso (desde la raíz del proyecto):
 *   node scripts/migrar-viajes.mjs
 *   node scripts/migrar-viajes.mjs --viajes=ruta/viajes.json --es=ruta/es.json --val=ruta/val.json
 *
 * No toca ni borra nada de lo antiguo: solo crea archivos nuevos en content/viajes/.
 * fotos.json ya no hace falta: las fotos se descubren leyendo la carpeta de imágenes.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.join('=')])
);
const rutaViajes = args.viajes || join(RAIZ, 'src/assets/data/viajes.json');
const rutaEs = args.es || join(RAIZ, 'src/assets/i18n/es.json');
const rutaVal = args.val || join(RAIZ, 'src/assets/i18n/val.json');
const IMAGENES = join(RAIZ, 'src/assets/images');
const SALIDA = join(RAIZ, 'content/viajes');

const viajesAntiguos = JSON.parse(readFileSync(rutaViajes, 'utf8'));
const textos = { es: JSON.parse(readFileSync(rutaEs, 'utf8')), val: JSON.parse(readFileSync(rutaVal, 'utf8')) };

const slug = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fotosDeCarpeta = (carpeta) => {
  const ruta = join(IMAGENES, String(carpeta));
  return existsSync(ruta) ? readdirSync(ruta) : [];
};

mkdirSync(SALIDA, { recursive: true });
const avisos = [];
let total = 0;
const fechasUsadas = new Set();

for (const [anyo, delAnyo] of Object.entries(viajesAntiguos)) {
  for (const [nombre, v] of Object.entries(delAnyo)) {
    const fecha = v.fechaInicio;
    fechasUsadas.add(fecha);
    const T = { es: textos.es[fecha] || {}, val: textos.val[fecha] || {} };
    if (!textos.es[fecha] && !textos.val[fecha]) avisos.push(`${fecha} ${nombre}: sin textos en es/val`);

    const prefijo = v.identificadorFotos;
    const archivos = fotosDeCarpeta(anyo);
    const reFoto = new RegExp(`^${escapar(prefijo)}(\\d+)\\.(jpe?g|png|webp|avif|gif)$`, 'i');
    const numerosExistentes = new Set(archivos.map((f) => (f.match(reFoto) || [])[1]).filter(Boolean).map(Number));

    // Une los textos de los idiomas de una clave en un objeto plano {es, val}
    const traducido = (clave) => {
      const o = {};
      for (const l of ['es', 'val']) if (T[l][clave]) o[l] = T[l][clave];
      return Object.keys(o).length ? o : null;
    };
    const bloques = [];
    const texto = (tipo, clave, extra = {}) => {
      const t = traducido(clave);
      if (t) bloques.push({ tipo, ...t, ...extra });
    };
    const parrafos = (b) => {
      for (let p = 1; p <= 10; p++) texto('parrafo', `bloque${b}_parrafo${p}`);
    };
    const foto = (n) => {
      if (!numerosExistentes.has(n)) return;
      const d = traducido(`descFoto${n}`);
      bloques.push({ tipo: 'foto', n, ...(d || {}) });
    };
    const cita = () => {
      const c = traducido('cita1');
      if (!c) return;
      const autor = traducido('personaCita1');
      bloques.push({ tipo: 'cita', ...c, ...(autor ? { autor } : {}) });
    };

    // Mismo orden en que la plantilla antigua pintaba las cosas
    texto('titulo', 'tituloParte1');
    parrafos(1);
    [1, 2, 3].forEach(foto);
    cita();
    foto(4); parrafos(2);
    texto('nota', 'nota1');
    foto(5); parrafos(3);
    foto(6); parrafos(4);
    if (v.mapaSrc && v.mapaSrc[0]) bloques.push({ tipo: 'mapa' });
    texto('titulo', 'tituloParte2');
    parrafos(5);
    [7, 8, 9, 10].forEach(foto);
    parrafos(6);
    [11, 12].forEach(foto);
    parrafos(7);
    for (let b = 8; b <= 15; b++) parrafos(b);
    // (las fotos 13, 14, ... no estaban en la plantilla antigua: ahora salen solas al final)

    if ((v.mapaSrc || []).length > 1) avisos.push(`${fecha} ${nombre}: tenía ${v.mapaSrc.length} mapas, solo se conserva el primero`);

    const salida = {
      destino: v.destino,
      fechaInicio: v.fechaInicio,
      fechaFin: v.fechaFin,
      categoria: v.categoria,
      provincia: v.provincia,
      pais: v.pais,
      precio: v.precio,
      estancia: v.estancia,
      tipoEstancia: v.tipoEstancia,
      transporte: v.transporte,
      personas: v.personas,
      prefijoFotos: prefijo,
      mapa: (v.mapaSrc && v.mapaSrc[0]) || '',
      infoInteres: v.infoInteres || [],
    };
    const desc = traducido('descPrincipal');
    if (desc) salida.descPrincipal = desc;

    const { ...cabecera } = salida;
    let json = JSON.stringify(cabecera, null, 2);
    json = json.replace(/\[\s*((?:"[^"\n]*"(?:,\s*)?)+)\s*\]/g, (_, dentro) => '[' + dentro.replace(/\s*\n\s*/g, ' ').trim() + ']');
    json = json.slice(0, json.lastIndexOf('\n}')) +
      ',\n  "bloques": [\n' + bloques.map((b) => '    ' + JSON.stringify(b)).join(',\n') + '\n  ]\n}\n';

    const archivo = join(SALIDA, `${v.fechaInicio}_${slug(v.destino)}.json`);
    writeFileSync(archivo, json);
    total++;
  }
}

// Claves de fecha en los i18n que no corresponden a ningún viaje
for (const l of ['es', 'val']) {
  for (const k of Object.keys(textos[l])) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && !fechasUsadas.has(k)) avisos.push(`${l}.json: la clave ${k} no corresponde a ningún viaje`);
  }
}

console.log(`✔ ${total} viajes migrados a content/viajes/`);
if (avisos.length) console.log('\nAvisos:\n - ' + avisos.join('\n - '));
