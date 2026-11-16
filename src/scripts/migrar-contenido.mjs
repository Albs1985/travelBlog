#!/usr/bin/env node
/**
 * MIGRACIÓN (se ejecuta una sola vez, después de migrar-viajes.mjs)
 * ------------------------------------------------------------------
 * Convierte frases, dibujos, fotos favoritas, recetas, preguntas del quiz, viajeros y relatos
 * del formato antiguo (datos en src/assets/data/*.json + textos duplicados en es.json y val.json)
 * al nuevo: un archivo por colección en content/, con los idiomas juntos.
 *
 * Uso (desde la raíz del proyecto):
 *   node scripts/migrar-contenido.mjs
 *   node scripts/migrar-contenido.mjs --datos=ruta/a/data --i18n=ruta/a/i18n --paginas=ruta/a/src/app/pages
 *
 * No borra ni modifica nada de lo antiguo: solo crea archivos en content/.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, CONTENIDO } from './lib/comun.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.join('=')])
);
const DATOS = args.datos || join(RAIZ, 'src/assets/data');
const I18N = args.i18n || join(RAIZ, 'src/assets/i18n');
const PAGINAS = args.paginas || join(RAIZ, 'src/app/pages');
const leer = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'));

const es = leer(join(I18N, 'es.json'));
const val = leer(join(I18N, 'val.json'));
const avisos = [];
const aviso = (m) => avisos.push(m);

/** Si el texto es igual en los dos idiomas se guarda una sola vez (cadena); si no, {es, val}. */
const t = (a, b) => {
  a = a ?? ''; b = b ?? '';
  if (a === b) return a || undefined;
  if (!a) return b;
  if (!b) return a;
  return { es: a, val: b };
};
const sinVacios = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)));
const unaLinea = (x) => '  ' + JSON.stringify(x);
const escribir = (ruta, contenido) => {
  mkdirSync(join(CONTENIDO, ruta, '..'), { recursive: true });
  writeFileSync(join(CONTENIDO, ruta), contenido);
};
const listaPorLineas = (arr) => '[\n' + arr.map(unaLinea).join(',\n') + '\n]\n';

// ------------------------------------------------------------------ frases
{
  const meta = leer(join(DATOS, 'frases.json'));
  const out = Object.entries(meta).map(([k, f]) => {
    if (String(f.id) !== k) aviso(`frases: la ficha nº ${k} apuntaba al texto nº ${f.id} (copia-pega); ahora usa su propio texto nº ${k}`);
    const e = es.frases[k] || {}, v = val.frases[k] || {};
    if (!es.frases[k]) aviso(`frases: no hay texto para la ficha nº ${k}`);
    return sinVacios({ persona: f.persona, fecha: f.anyo, frase: t(e.frase, v.frase), explicacion: t(e.explicacion, v.explicacion) });
  });
  escribir('frases.json', listaPorLineas(out));
  console.log(`✔ frases: ${out.length}`);
}

// ------------------------------------------------------------------ dibujos
{
  const meta = leer(join(DATOS, 'dibujos.json'));
  const out = Object.entries(meta).map(([k, d]) =>
    sinVacios({ n: Number(k), persona: d.persona, anyo: Number(d.anyo), edad: Number(d.edad), detalle: t(es.dibujos[k]?.detalle, val.dibujos[k]?.detalle) })
  );
  escribir('dibujos.json', listaPorLineas(out));
  console.log(`✔ dibujos: ${out.length}`);
}

// ------------------------------------------------------------------ fotos favoritas
{
  const meta = leer(join(DATOS, 'fotosFav.json'));
  const fe = es.favoritos, fv = val.favoritos;
  let libres = 0;
  const out = Object.values(meta).map((f) => {
    const n = Number((f.id.match(/fotoFav(\d+)\./i) || [])[1]);
    if (!n) aviso(`favoritos: no se pudo sacar el número de ${f.id}`);
    let desc;
    if (fe[f.idDesc] !== undefined) desc = t(fe[f.idDesc], fv[f.idDesc]);
    else { desc = f.idDesc; libres++; } // en estas fichas el "idDesc" ya era el propio texto, sin traducir
    return sinVacios({
      n,
      anyo: f.anyo,
      lugar: f.lugar,
      etiquetas: f.categoria,
      personas: f.personas.split(',').map((p) => p.trim()).filter(Boolean),
      desc,
    });
  });
  if (libres) aviso(`favoritos: ${libres} fotos tenían la descripción escrita directamente (sin traducción); se ha puesto igual en los dos idiomas`);
  const salida = {
    // Fotos de assets/images/about/about<N>.jpg: salen solas, con estos datos comunes
    about: { carpeta: 'about', prefijo: 'about', anyo: 'Época de Antaño', lugar: 'Por la zona', etiquetas: 'Juventud, Antaño, Infancia, Jovens', personas: ['Alba', 'Albert'] },
    fotos: out,
  };
  escribir('favoritos.json', '{\n  "about": ' + JSON.stringify(salida.about) + ',\n  "fotos": [\n' + out.map((x) => '  ' + unaLinea(x)).join(',\n') + '\n  ]\n}\n');
  console.log(`✔ favoritos: ${out.length}`);
}

// ------------------------------------------------------------------ recetas
{
  const meta = leer(join(DATOS, 'recetas.json'));
  const TIPOS = ['frio', 'caliente', 'dulce'];
  const METODOS = ['horno', 'microondas', 'olla', 'nevera'];
  const out = Object.entries(meta).map(([k, r]) => {
    const e = es.recetas[k] || {}, v = val.recetas[k] || {};
    const palabras = r.categoria.split(',').map((x) => x.trim().toLowerCase());
    const tipos = TIPOS.filter((x) => palabras.includes(x));
    const metodo = METODOS.find((x) => palabras.includes(x));
    const lista = (prefijo, ids) => ids.map((i) => t(e[prefijo + i], v[prefijo + i])).filter(Boolean);
    const sinNegativos = (x) => (typeof x === 'number' && x > 0 ? x : undefined);
    const temp = r.temperatura === -1 || r.temperatura === '' ? undefined : r.temperatura;
    return sinVacios({
      nombre: t(e.nombre, v.nombre),
      frase: t(e.frase, v.frase),
      categoria: t(e.categoria, v.categoria),
      cocinero: r.cocinero,
      dificultad: r.dificultad,
      raciones: r.raciones,
      tipos,
      metodo,
      tiempoPreparacion: sinNegativos(r.tiempoPreparacion),
      tiempoCoccion: sinNegativos(r.tiempoHorno),
      temperatura: temp,
      imagen: r.imagen.replace(/^assets\/images\/recetas\//, ''),
      ingredientes: lista('ingrediente', r.ingredientes),
      utensilios: lista('utensilio', r.utensilios),
      pasos: lista('paso', r.numPasos),
    });
  });
  escribir('recetas.json', listaPorLineas(out));
  console.log(`✔ recetas: ${out.length}`);
}

// ------------------------------------------------------------------ preguntas del quiz
{
  const pe = leer(join(DATOS, 'preguntasES.json'));
  const pv = leer(join(DATOS, 'preguntasVAL.json'));
  const idioma = (p) => ({
    pregunta: p.Pregunta,
    correcta: p.Respuesta,
    incorrectas: p.Otras_respuestas.filter((o) => o !== p.Respuesta),
  });
  const out = Object.keys(pe).map((k) => {
    const a = pe[k], b = pv[k];
    if (!b) aviso(`preguntas: la pregunta nº ${k} no existe en valenciano`);
    if (a.Nivel !== b?.Nivel) aviso(`preguntas: la pregunta nº ${k} tiene niveles distintos en es y val`);
    let nivel = a.Nivel;
    if (!nivel) { nivel = 'medio'; aviso(`preguntas: la pregunta nº ${k} no tenía nivel y por eso nunca salía en el juego; se ha puesto "medio"`); }
    return { nivel, es: idioma(a), val: b ? idioma(b) : idioma(a) };
  });
  escribir('preguntas.json', listaPorLineas(out));
  console.log(`✔ preguntas: ${out.length}`);
}

// ------------------------------------------------------------------ viajeros
{
  const meta = leer(join(DATOS, 'viajeros.json'));
  const out = Object.values(meta).map((p) =>
    sinVacios({ nombre: p.nombreCorto, nombreCompleto: p.nombreCompleto, nacimiento: p.nacimiento, aka: p.aka, info: p.info })
  );
  escribir('viajeros.json', listaPorLineas(out));
  console.log(`✔ viajeros: ${out.length}`);
}

// ------------------------------------------------------------------ relatos
// Se leen de las plantillas (para conservar el orden de textos y fotos) y de es.json / val.json.
const RELATOS = [
  {
    slug: 'relatoAlbert', clave: 'relatoAlbaiAlbert', carpeta: 'relato-albert', icono: 'relacion.png',
    supra: 'titulo', titulo: 'subtitulo', portada: 'perfiles/fotoPerfilFamilia.jpg', modoLibro: true, siguiente: '2019-04-06_Fanzara',
  },
  {
    slug: 'relatoIaiaAna', clave: 'relatoIaiaAna', carpeta: 'relato-iaia-ana', icono: 'anciana.png',
    supra: 'subtitulo', titulo: 'titulo', protegido: true, sinIdioma: true, nacimiento: '1953-11-16', siguiente: '2019-04-06_Fanzara',
    // La plantilla pedía "refranMaria10" pero el texto se llamaba "refranMaria610" (se veía la clave en crudo)
    corregirClaves: { refranMaria10: 'refranMaria610' },
    // Textos que existían en es.json pero la plantilla nunca mostraba: se guardan como bloques ocultos ("oculto": true)
    ocultosAntes: { bloque4_parrafo1: ['bloque3_parrafo1', 'bloque3_parrafo2', 'bloque3_parrafo3'] },
  },
  {
    slug: 'relatoBodaEsteve', clave: 'relatoBodaEsteve', carpeta: 'relato-boda-esteve', icono: 'discurso.png',
    titulo: 'titulo', protegido: true,
  },
];

for (const R of RELATOS) {
  const ruta = join(PAGINAS, 'historias', R.carpeta, `${R.carpeta}.component.html`);
  if (!existsSync(ruta)) { aviso(`relatos: no se encuentra ${ruta}`); continue; }
  let html = readFileSync(ruta, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const ini = html.search(/esModoLibro\s*===\s*false/);
  const fin = html.search(/esModoLibro\s*===\s*true/);
  if (ini >= 0) html = html.slice(ini, fin > ini ? fin : undefined);

  const E = es[R.clave], V = val[R.clave];
  const usadas = new Set();
  const txt = (k) => { k = R.corregirClaves?.[k] ?? k; usadas.add(k); return t(E[k], V[k]); };
  const claveDe = (k) => k.replace(`${R.clave}.`, '');
  const bloques = [];
  let mapa = '';
  let portada;
  let lista = null;
  const poner = (tipo, k) => {
    for (const oculta of R.ocultosAntes?.[claveDe(k)] || []) {
      const o = txt(oculta);
      if (o !== undefined) bloques.push({ tipo: 'parrafo', oculto: true, ...(typeof o === 'string' ? { texto: o } : o) });
    }
    const x = txt(claveDe(k));
    if (x === undefined) return;
    bloques.push(typeof x === 'string' ? { tipo, texto: x } : { tipo, ...x });
  };

  const re = /<figure[\s\S]*?<\/figure>|<blockquote[\s\S]*?<\/blockquote>|<iframe[^>]*src="([^"]+)"[\s\S]*?<\/iframe>|<(h[1-4])[^>]*>\s*(?:<b>)?\s*\{\{\s*'([^']+)'[^}]*\}\}\s*(?:<\/b>)?\s*<\/\2>|<p>\s*\{\{\s*'([^']+)'[^}]*\}\}\s*<\/p>|<li>\s*\{\{\s*'([^']+)'[^}]*\}\}\s*<\/li>|<ul[^>]*>|<\/ul>/g;
  let m;
  let hayTexto = false;
  while ((m = re.exec(html))) {
    const [tok, iframeSrc, hTag, hKey, pKey, liKey] = m;
    if (tok.startsWith('<figure')) {
      const src = (tok.match(/<img[^>]*\ssrc="assets\/images\/([^"]+)"/) || [])[1];
      const cap = (tok.match(/<figcaption[^>]*>\s*\{\{\s*'([^']+)'/) || [])[1];
      if (!src) continue;
      const desc = cap && cap.startsWith(R.clave + '.') ? txt(claveDe(cap)) : undefined;
      if (!hayTexto && !portada && !bloques.length && !lista) { portada = sinVacios({ src, desc }); continue; }
      bloques.push(typeof desc === 'string' ? { tipo: 'foto', src, desc } : { tipo: 'foto', src, ...(desc || {}) });
    } else if (tok.startsWith('<blockquote')) {
      const c = (tok.match(/\{\{\s*'([^']+)'/g) || []).map((x) => x.match(/'([^']+)'/)[1]);
      const [kc, ka] = c;
      const cita = txt(claveDe(kc));
      const autor = ka ? txt(claveDe(ka)) : undefined;
      if (cita !== undefined) bloques.push(sinVacios({ tipo: 'cita', ...(typeof cita === 'string' ? { texto: cita } : cita), autor }));
      hayTexto = true;
    } else if (tok.startsWith('<iframe')) {
      mapa = iframeSrc;
      bloques.push({ tipo: 'mapa' });
    } else if (hTag) {
      if (!hKey.startsWith(R.clave + '.')) continue;
      poner(hTag === 'h2' ? 'titulo' : 'subtitulo', hKey);
      hayTexto = true;
    } else if (pKey) {
      if (!pKey.startsWith(R.clave + '.')) continue;
      poner('parrafo', pKey);
      hayTexto = true;
    } else if (tok.startsWith('<ul')) {
      lista = [];
    } else if (liKey) {
      if (lista && liKey.startsWith(R.clave + '.')) { const x = txt(claveDe(liKey)); if (x !== undefined) lista.push(x); }
    } else if (tok === '</ul>' && lista) {
      if (lista.length) bloques.push({ tipo: 'lista', items: lista });
      lista = null;
    }
  }

  // Cabecera
  const supra = R.supra ? txt(R.supra) : undefined;
  const titulo = R.titulo ? txt(R.titulo) : undefined;
  const fecha = txt('fecha');
  // La foto principal puede tener pie en el texto (descFoto1 si va antes del primer texto)
  const relato = sinVacios({
    supra: titulo === undefined ? undefined : supra,
    titulo: titulo === undefined ? supra : titulo,
    fecha,
    icono: R.icono,
    nacimiento: R.nacimiento,
    protegido: R.protegido,
    sinIdioma: R.sinIdioma,
    modoLibro: R.modoLibro,
    siguiente: R.siguiente,
    mapa,
    portada: R.portada ? { src: R.portada } : portada,
  });
  let json = JSON.stringify(relato, null, 2);
  json = json.slice(0, json.lastIndexOf('\n}')) + ',\n  "bloques": [\n' + bloques.map((b) => '  ' + unaLinea(b)).join(',\n') + '\n  ]\n}\n';
  escribir(`relatos/${R.slug}.json`, json);

  const sinColocar = Object.keys(E).filter((k) => !usadas.has(k) && E[k] !== '');
  console.log(`✔ relato ${R.slug}: ${bloques.length} bloques` + (sinColocar.length ? ` (textos que no estaban en la plantilla: ${sinColocar.join(', ')})` : ''));
  if (sinColocar.length) aviso(`relato ${R.slug}: textos de es.json que no aparecían en la plantilla (no se migran): ${sinColocar.join(', ')}`);
}

if (avisos.length) console.log('\nAvisos:\n - ' + avisos.join('\n - '));
