#!/usr/bin/env node
/**
 * GENERADOR DE DATOS DE VIAJES
 * ----------------------------
 * Lee   content/viajes/*.json      (un archivo por viaje, lo único que se escribe a mano)
 *       src/assets/images/<año>/   (las fotos: se descubren solas, no hay que listarlas)
 * Crea  src/assets/data/generated/index.json          (resumen de todos los viajes, ligero)
 *       src/assets/data/generated/viajes/<viaje>.json (detalle de cada viaje, se carga al abrirlo)
 *
 * Calcula automáticamente: año, día/mes, nº de fotos, foto de portada, viaje anterior/siguiente,
 * fotos sin colocar en ningún bloque, portada de cada año...
 *
 * Se ejecuta solo con `npm start` y `npm run build`. A mano: `node scripts/build-data.mjs`
 * Opción --strict: los avisos se tratan como errores (útil en integración continua).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENIDO = join(RAIZ, 'content', 'viajes');
const IMAGENES = join(RAIZ, 'src', 'assets', 'images');
const SALIDA = join(RAIZ, 'src', 'assets', 'data', 'generated');
const STRICT = process.argv.includes('--strict');

/** Idiomas de la web. Para añadir uno nuevo: ponerlo aquí y escribir su clave (p. ej. "en") en los textos. */
const IDIOMAS = ['es', 'val'];
const CATEGORIAS = ['Playa', 'Montaña', 'Ciudad', 'Nieve'];
const EXTENSIONES = 'jpe?g|png|webp|avif|gif';
const TIPOS_BLOQUE = ['titulo', 'parrafo', 'nota', 'cita', 'foto', 'mapa'];

const errores = [];
const avisos = [];
const error = (archivo, msg) => errores.push(`${archivo}: ${msg}`);
const aviso = (archivo, msg) => avisos.push(`${archivo}: ${msg}`);

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slug = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dosDigitos = (n) => String(n).padStart(2, '0');

/** Convierte un texto (cadena u objeto con claves de idioma) en {es, val}; null si está vacío. */
function texto(origen) {
  if (origen == null) return null;
  if (typeof origen === 'string') {
    return origen.trim() ? Object.fromEntries(IDIOMAS.map((l) => [l, origen])) : null;
  }
  const salida = {};
  for (const l of IDIOMAS) if (typeof origen[l] === 'string' && origen[l].trim()) salida[l] = origen[l];
  return Object.keys(salida).length ? salida : null;
}

const listados = new Map();
const listar = (carpeta) => {
  if (!listados.has(carpeta)) {
    const ruta = join(IMAGENES, carpeta);
    listados.set(carpeta, existsSync(ruta) ? readdirSync(ruta) : []);
  }
  return listados.get(carpeta);
};

// ---------------------------------------------------------------- lectura de los viajes
if (!existsSync(CONTENIDO)) {
  console.error(`✖ No existe la carpeta ${CONTENIDO}. ¿Has ejecutado antes la migración?`);
  process.exit(1);
}
const archivos = readdirSync(CONTENIDO).filter((f) => f.endsWith('.json')).sort();
const viajes = [];
const ids = new Map();

for (const archivo of archivos) {
  let v;
  try {
    v = JSON.parse(readFileSync(join(CONTENIDO, archivo), 'utf8'));
  } catch (e) {
    error(archivo, `JSON no válido (${e.message})`);
    continue;
  }
  for (const campo of ['destino', 'fechaInicio', 'fechaFin', 'categoria']) {
    if (!v[campo]) error(archivo, `falta el campo "${campo}"`);
  }
  const reFecha = /^\d{4}-\d{2}-\d{2}$/;
  if (v.fechaInicio && !reFecha.test(v.fechaInicio)) error(archivo, 'fechaInicio debe tener el formato AAAA-MM-DD');
  if (v.fechaFin && !reFecha.test(v.fechaFin)) error(archivo, 'fechaFin debe tener el formato AAAA-MM-DD');
  if (!v.destino || !reFecha.test(v.fechaInicio || '') || !reFecha.test(v.fechaFin || '')) continue;
  if (v.fechaFin < v.fechaInicio) aviso(archivo, 'fechaFin es anterior a fechaInicio');
  if (!archivo.startsWith(v.fechaInicio)) aviso(archivo, `el nombre del archivo debería empezar por ${v.fechaInicio}`);
  if (!CATEGORIAS.includes(v.categoria)) aviso(archivo, `categoría "${v.categoria}" desconocida (esperadas: ${CATEGORIAS.join(', ')})`);

  // El id mantiene el formato de siempre (fechaInicio_destino) para que los enlaces antiguos sigan funcionando
  const id = `${v.fechaInicio}_${v.destino}`;
  if (ids.has(id)) {
    error(archivo, `duplicado: ya existe otro viaje con el id "${id}" (${ids.get(id)})`);
    continue;
  }
  ids.set(id, archivo);
  viajes.push({ id, archivo, v });
}

viajes.sort((a, b) => a.v.fechaInicio.localeCompare(b.v.fechaInicio) || a.v.destino.localeCompare(b.v.destino));

// ---------------------------------------------------------------- construcción
const resultado = [];

viajes.forEach(({ id, archivo, v }, i) => {
  const anyo = Number(v.fechaInicio.slice(0, 4));
  const carpeta = String(v.carpetaFotos || anyo);
  const prefijo = v.prefijoFotos || '';

  // Fotos: <prefijo>Principal.jpg y <prefijo>1.jpg, <prefijo>2.jpg ...
  const porNumero = new Map();
  let principal = '';
  if (prefijo) {
    const re = new RegExp(`^${escapar(prefijo)}(Principal|\\d+)\\.(${EXTENSIONES})$`, 'i');
    for (const f of listar(carpeta).slice().sort()) {
      const m = f.match(re);
      if (!m) continue;
      if (/^principal$/i.test(m[1])) {
        if (principal) aviso(archivo, `hay dos fotos principales (${principal} y ${f}); se usa ${principal}`);
        else principal = f;
      } else {
        const n = Number(m[1]);
        if (porNumero.has(n)) aviso(archivo, `hay dos fotos con el número ${n} (${porNumero.get(n)} y ${f}); se usa ${porNumero.get(n)}`);
        else porNumero.set(n, f);
      }
    }
    if (porNumero.size === 0) aviso(archivo, `no se encontraron fotos "${prefijo}N.jpg" en assets/images/${carpeta}/`);
  } else {
    aviso(archivo, 'sin "prefijoFotos": el viaje no tendrá fotos');
  }
  const numerosOrdenados = [...porNumero.keys()].sort((a, b) => a - b);
  const ruta = (f) => `${carpeta}/${f}`;
  const fotos = numerosOrdenados.map((n) => ruta(porNumero.get(n)));
  const portada = principal ? ruta(principal) : fotos[0] || '';
  if (prefijo && !principal) aviso(archivo, `no hay foto principal "${prefijo}Principal.jpg"; se usa la primera foto`);

  // Bloques: se validan, se resuelven las fotos y se agrupan las fotos consecutivas
  const usadas = new Set();
  const bloques = [];
  (v.bloques || []).forEach((b, k) => {
    const donde = `bloque #${k + 1}`;
    if (!TIPOS_BLOQUE.includes(b.tipo)) return error(archivo, `${donde}: tipo "${b.tipo}" desconocido (válidos: ${TIPOS_BLOQUE.join(', ')})`);
    if (b.tipo === 'mapa') {
      if (!v.mapa) return aviso(archivo, `${donde}: hay un bloque "mapa" pero no hay campo "mapa"`);
      return bloques.push({ tipo: 'mapa' });
    }
    if (b.tipo === 'foto') {
      const f = porNumero.get(Number(b.n));
      if (!f) return aviso(archivo, `${donde}: la foto ${b.n} no existe en assets/images/${carpeta}/ (se omite)`);
      usadas.add(Number(b.n));
      const item = { src: ruta(f) };
      const desc = texto(b);
      if (desc) item.desc = desc;
      const ultimo = bloques[bloques.length - 1];
      if (ultimo && ultimo.tipo === 'fotos') ultimo.fotos.push(item);
      else bloques.push({ tipo: 'fotos', fotos: [item] });
      return;
    }
    const t = texto(b);
    if (!t) return aviso(archivo, `${donde} (${b.tipo}): sin texto, se omite`);
    const bloque = { tipo: b.tipo, texto: t };
    if (b.tipo === 'cita') {
      const autor = texto(b.autor);
      if (autor) bloque.autor = autor;
    }
    bloques.push(bloque);
  });

  // Fotos de la carpeta que no se han colocado en ningún bloque: salen al final automáticamente
  const fotosExtra = numerosOrdenados.filter((n) => !usadas.has(n)).map((n) => ruta(porNumero.get(n)));

  // Comprobaciones de personas (foto de perfil)
  for (const p of v.personas || []) {
    if (!existsSync(join(IMAGENES, 'perfiles', `fotoPerfil${p}.jpg`))) aviso(archivo, `no existe la foto de perfil de "${p}" (assets/images/perfiles/fotoPerfil${p}.jpg)`);
  }

  const [, mesI, diaI] = v.fechaInicio.split('-');
  const [, mesF, diaF] = v.fechaFin.split('-');

  const resumen = {
    id,
    archivo: slug(id),
    anyo,
    fechaInicio: v.fechaInicio,
    fechaFin: v.fechaFin,
    diaInicio: dosDigitos(Number(diaI)),
    mesInicio: mesI,
    diaFin: dosDigitos(Number(diaF)),
    mesFin: mesF,
    destino: v.destino,
    categoria: v.categoria,
    provincia: v.provincia || '',
    pais: v.pais || '',
    precio: v.precio || 0,
    estancia: v.estancia || '',
    tipoEstancia: v.tipoEstancia || '',
    transporte: v.transporte || [],
    personas: v.personas || [],
    portada,
    fotos,
    numFotos: fotos.length,
    anterior: i > 0 ? viajes[i - 1].id : '',
    siguiente: i < viajes.length - 1 ? viajes[i + 1].id : '',
  };
  const detalle = {
    ...resumen,
    mapa: v.mapa || '',
    infoInteres: v.infoInteres || [],
    ...(texto(v.descPrincipal) ? { descPrincipal: texto(v.descPrincipal) } : {}),
    bloques,
    fotosExtra,
  };
  resultado.push({ resumen, detalle });
});

// Portada de cada año: <año>/Portada<año>.jpg
const anyos = [...new Set(resultado.map((r) => r.resumen.anyo))].sort((a, b) => b - a).map((anyo) => {
  const re = new RegExp(`^Portada${anyo}\\.(${EXTENSIONES})$`, 'i');
  const f = listar(String(anyo)).find((x) => re.test(x));
  if (!f) aviso(`año ${anyo}`, `no hay portada del año (assets/images/${anyo}/Portada${anyo}.jpg)`);
  return { anyo, portada: f ? `${anyo}/${f}` : '' };
});

// ---------------------------------------------------------------- resultado
for (const e of avisos) console.warn(`⚠  ${e}`);
if (errores.length || (STRICT && avisos.length)) {
  for (const e of errores) console.error(`✖  ${e}`);
  console.error(`\nNo se han generado los datos (${errores.length} errores${STRICT ? `, ${avisos.length} avisos` : ''}).`);
  process.exit(1);
}

rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(join(SALIDA, 'viajes'), { recursive: true });
writeFileSync(join(SALIDA, 'index.json'), JSON.stringify({ anyos, viajes: resultado.map((r) => r.resumen) }));
for (const { detalle } of resultado) {
  writeFileSync(join(SALIDA, 'viajes', `${detalle.archivo}.json`), JSON.stringify(detalle));
}
const totalFotos = resultado.reduce((s, r) => s + r.resumen.numFotos, 0);
console.log(`✔ ${resultado.length} viajes, ${anyos.length} años, ${totalFotos} fotos → src/assets/data/generated/`);
