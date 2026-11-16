/**
 * Colecciones simples: un único archivo content/<nombre>.json por colección.
 * frases, dibujos, favoritos, recetas, preguntas, viajeros
 */
import { join } from 'node:path';
import { CONTENIDO, IMAGENES, listar, fotosNumeradas, leerJson, texto } from './comun.mjs';
import { existsSync } from 'node:fs';

const compacto = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)));
const leerLista = (nombre, reporte) => {
  const datos = leerJson(join(CONTENIDO, `${nombre}.json`), `content/${nombre}.json`, reporte);
  if (datos === undefined) return [];
  return datos;
};
const exigirLista = (datos, nombre, reporte) => {
  if (!Array.isArray(datos)) { reporte.error(`content/${nombre}.json`, 'debe ser una lista [ ... ]'); return []; }
  return datos;
};

export function construirFrases(reporte) {
  const archivo = 'content/frases.json';
  const lista = exigirLista(leerLista('frases', reporte), 'frases', reporte);
  const salida = [];
  lista.forEach((f, i) => {
    const donde = `${archivo} · frase #${i + 1}`;
    const frase = texto(f.frase);
    if (!frase) return reporte.error(donde, 'falta el texto de "frase"');
    if (!f.persona) reporte.aviso(donde, 'sin "persona"');
    salida.push(compacto({ id: i + 1, persona: f.persona, fecha: f.fecha != null ? String(f.fecha) : '', frase, explicacion: texto(f.explicacion) }));
  });
  return { archivos: { 'frases.json': salida }, resumen: `${salida.length} frases` };
}

export function construirDibujos(reporte) {
  const archivo = 'content/dibujos.json';
  const lista = exigirLista(leerLista('dibujos', reporte), 'dibujos', reporte);
  const fotos = fotosNumeradas('dibujos', 'dibujo', archivo, reporte);
  const usados = new Set();
  const salida = [];
  lista.forEach((d, i) => {
    const donde = `${archivo} · dibujo #${i + 1}`;
    if (d.n == null) return reporte.error(donde, 'falta "n" (el número de la foto: dibujo<n>.jpg)');
    const f = fotos.get(Number(d.n));
    if (!f) return reporte.aviso(donde, `no existe la foto dibujos/dibujo${d.n}.jpg (se omite)`);
    if (usados.has(d.n)) reporte.aviso(donde, `el dibujo ${d.n} está repetido`);
    usados.add(d.n);
    salida.push(compacto({ id: Number(d.n), src: `dibujos/${f}`, persona: d.persona, anyo: d.anyo, edad: d.edad, detalle: texto(d.detalle) }));
  });
  for (const n of fotos.keys()) if (!usados.has(n)) reporte.aviso(archivo, `la foto dibujos/${fotos.get(n)} no tiene ficha en dibujos.json (no se enseña)`);
  return { archivos: { 'dibujos.json': salida }, resumen: `${salida.length} dibujos` };
}

export function construirFavoritos(reporte) {
  const archivo = 'content/favoritos.json';
  const datos = leerJson(join(CONTENIDO, 'favoritos.json'), archivo, reporte) || {};
  const lista = exigirLista(datos.fotos || [], 'favoritos', reporte);
  const fotos = fotosNumeradas('favoritos', 'fotoFav', archivo, reporte);
  const usadas = new Set();
  const salida = [];
  lista.forEach((f, i) => {
    const donde = `${archivo} · foto #${i + 1}`;
    if (f.n == null) return reporte.error(donde, 'falta "n" (el número de la foto: fotoFav<n>.jpg)');
    const real = fotos.get(Number(f.n));
    if (!real) return reporte.aviso(donde, `no existe la foto favoritos/fotoFav${f.n}.jpg (se omite)`);
    if (usadas.has(f.n)) reporte.aviso(donde, `la foto ${f.n} está repetida`);
    usadas.add(f.n);
    const personas = Array.isArray(f.personas) ? f.personas : String(f.personas || '').split(',').map((p) => p.trim()).filter(Boolean);
    salida.push(compacto({ src: `favoritos/${real}`, anyo: f.anyo != null ? String(f.anyo) : '', lugar: f.lugar, etiquetas: f.etiquetas, personas, desc: texto(f.desc) }));
  });
  const sinFicha = [...fotos.keys()].filter((n) => !usadas.has(n));
  if (sinFicha.length) reporte.aviso(archivo, `${sinFicha.length} fotos de favoritos/ no tienen ficha y no se enseñan: ${sinFicha.slice(0, 12).map((n) => fotos.get(n)).join(', ')}${sinFicha.length > 12 ? '...' : ''}`);

  // Fotos de "about": se añaden solas, con los datos comunes de "about"
  const a = datos.about;
  let nAbout = 0;
  if (a) {
    const delAbout = fotosNumeradas(a.carpeta || 'about', a.prefijo || 'about', archivo, reporte);
    for (const n of [...delAbout.keys()].sort((x, y) => x - y)) {
      salida.push(compacto({ src: `${a.carpeta || 'about'}/${delAbout.get(n)}`, anyo: a.anyo, lugar: a.lugar, etiquetas: a.etiquetas, personas: a.personas }));
      nAbout++;
    }
  }
  return { archivos: { 'favoritos.json': salida }, resumen: `${salida.length - nAbout} fotos favoritas + ${nAbout} de "about"` };
}

const TIPOS_RECETA = ['frio', 'caliente', 'dulce'];
const METODOS_RECETA = ['horno', 'microondas', 'olla', 'nevera'];

export function construirRecetas(reporte) {
  const archivo = 'content/recetas.json';
  const lista = exigirLista(leerLista('recetas', reporte), 'recetas', reporte);
  const salida = [];
  lista.forEach((r, i) => {
    const donde = `${archivo} · receta #${i + 1}`;
    const nombre = texto(r.nombre);
    if (!nombre) return reporte.error(donde, 'falta "nombre"');
    const pasos = (r.pasos || []).map(texto).filter(Boolean);
    if (!pasos.length) reporte.aviso(donde, 'sin pasos');
    const ingredientes = (r.ingredientes || []).map(texto).filter(Boolean);
    if (!ingredientes.length) reporte.aviso(donde, 'sin ingredientes');
    for (const tp of r.tipos || []) if (!TIPOS_RECETA.includes(tp)) reporte.aviso(donde, `tipo "${tp}" desconocido (válidos: ${TIPOS_RECETA.join(', ')})`);
    if (r.metodo && !METODOS_RECETA.includes(r.metodo)) reporte.aviso(donde, `método "${r.metodo}" desconocido (válidos: ${METODOS_RECETA.join(', ')})`);
    if (r.imagen && !existsSync(join(IMAGENES, 'recetas', r.imagen))) reporte.aviso(donde, `no existe la imagen recetas/${r.imagen}`);
    salida.push(compacto({
      id: i + 1,
      nombre,
      frase: texto(r.frase),
      categoria: texto(r.categoria),
      cocinero: r.cocinero,
      dificultad: r.dificultad,
      raciones: r.raciones,
      tipos: r.tipos,
      metodo: r.metodo,
      tiempoPreparacion: r.tiempoPreparacion,
      tiempoCoccion: r.tiempoCoccion,
      temperatura: r.temperatura,
      imagen: r.imagen ? `recetas/${r.imagen}` : '',
      ingredientes,
      utensilios: (r.utensilios || []).map(texto).filter(Boolean),
      pasos,
    }));
  });
  return { archivos: { 'recetas.json': salida }, resumen: `${salida.length} recetas` };
}

const NIVELES = ['facil', 'medio', 'dificil'];

export function construirPreguntas(reporte) {
  const archivo = 'content/preguntas.json';
  const lista = exigirLista(leerLista('preguntas', reporte), 'preguntas', reporte);
  const salida = [];
  lista.forEach((p, i) => {
    const donde = `${archivo} · pregunta #${i + 1}`;
    if (!NIVELES.includes(p.nivel)) return reporte.error(donde, `"nivel" debe ser ${NIVELES.join(', ')} (es "${p.nivel}")`);
    const q = { id: i + 1, nivel: p.nivel };
    let ok = true;
    for (const l of ['es', 'val']) {
      const x = p[l];
      if (!x || !x.pregunta || !x.correcta || !Array.isArray(x.incorrectas) || x.incorrectas.length === 0) {
        reporte.error(donde, `en "${l}" hacen falta "pregunta", "correcta" y una lista "incorrectas"`);
        ok = false;
        continue;
      }
      if (x.incorrectas.includes(x.correcta)) reporte.aviso(donde, `en "${l}" la respuesta correcta también está entre las incorrectas`);
      q[l] = { pregunta: x.pregunta, correcta: x.correcta, incorrectas: x.incorrectas };
    }
    if (ok && p.es.incorrectas.length !== p.val.incorrectas.length) reporte.aviso(donde, 'es y val tienen distinto número de respuestas incorrectas');
    if (ok) salida.push(q);
  });
  return { archivos: { 'preguntas.json': salida }, resumen: `${salida.length} preguntas` };
}

export function construirViajeros(reporte) {
  const archivo = 'content/viajeros.json';
  const lista = exigirLista(leerLista('viajeros', reporte), 'viajeros', reporte);
  const salida = [];
  lista.forEach((v, i) => {
    const donde = `${archivo} · viajero #${i + 1}`;
    if (!v.nombre) return reporte.error(donde, 'falta "nombre" (el nombre corto: sale en las fotos de perfil y en los viajes)');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.nacimiento || '')) reporte.error(donde, '"nacimiento" debe tener el formato AAAA-MM-DD');
    if (!existsSync(join(IMAGENES, 'perfiles', `fotoPerfil${v.nombre}.jpg`))) reporte.aviso(donde, `no existe assets/images/perfiles/fotoPerfil${v.nombre}.jpg`);
    salida.push(compacto({
      nombre: v.nombre,
      nombreCompleto: v.nombreCompleto || v.nombre,
      nacimiento: v.nacimiento,
      aka: v.aka,
      info: texto(v.info),
      fotoPerfil: `assets/images/perfiles/fotoPerfil${v.nombre}.jpg`,
    }));
  });
  return { archivos: { 'viajeros.json': salida }, resumen: `${salida.length} viajeros` };
}
