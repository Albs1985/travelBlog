/**
 * Viajes: content/viajes/*.json  ->  index.json + viajes/<viaje>.json
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENIDO, IMAGENES, EXTENSIONES, IDIOMAS, Reporte, escapar, slug, texto, listar, fotosNumeradas, leerJson, procesarBloques } from './comun.mjs';

const CATEGORIAS = ['Playa', 'Montaña', 'Ciudad', 'Nieve'];
const dosDigitos = (n) => String(n).padStart(2, '0');

export function construirViajes(reporte) {
  const carpeta = join(CONTENIDO, 'viajes');
  if (!existsSync(carpeta)) {
    reporte.error('content/viajes', 'no existe la carpeta. ¿Has ejecutado antes la migración?');
    return { resumenes: [], detalles: [], anyos: [] };
  }
  const archivos = readdirSync(carpeta).filter((f) => f.endsWith('.json')).sort();
  const viajes = [];
  const ids = new Map();

  for (const archivo of archivos) {
    const v = leerJson(join(carpeta, archivo), archivo, reporte);
    if (!v) continue;
    for (const campo of ['destino', 'fechaInicio', 'fechaFin', 'categoria']) {
      if (!v[campo]) reporte.error(archivo, `falta el campo "${campo}"`);
    }
    const reFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (v.fechaInicio && !reFecha.test(v.fechaInicio)) reporte.error(archivo, 'fechaInicio debe tener el formato AAAA-MM-DD');
    if (v.fechaFin && !reFecha.test(v.fechaFin)) reporte.error(archivo, 'fechaFin debe tener el formato AAAA-MM-DD');
    if (!v.destino || !reFecha.test(v.fechaInicio || '') || !reFecha.test(v.fechaFin || '')) continue;
    if (v.fechaFin < v.fechaInicio) reporte.aviso(archivo, 'fechaFin es anterior a fechaInicio');
    if (!archivo.startsWith(v.fechaInicio)) reporte.aviso(archivo, `el nombre del archivo debería empezar por ${v.fechaInicio}`);
    if (!CATEGORIAS.includes(v.categoria)) reporte.aviso(archivo, `categoría "${v.categoria}" desconocida (esperadas: ${CATEGORIAS.join(', ')})`);

    // El id mantiene el formato de siempre (fechaInicio_destino) para que los enlaces antiguos sigan funcionando
    const id = `${v.fechaInicio}_${v.destino}`;
    if (ids.has(id)) {
      reporte.error(archivo, `duplicado: ya existe otro viaje con el id "${id}" (${ids.get(id)})`);
      continue;
    }
    ids.set(id, archivo);
    viajes.push({ id, archivo, v });
  }

  viajes.sort((a, b) => a.v.fechaInicio.localeCompare(b.v.fechaInicio) || a.v.destino.localeCompare(b.v.destino));

  const resultado = [];
  viajes.forEach(({ id, archivo, v }, i) => {
    const anyo = Number(v.fechaInicio.slice(0, 4));
    const carpetaFotos = String(v.carpetaFotos || anyo);
    const prefijo = v.prefijoFotos || '';

    // Fotos: <prefijo>Principal.jpg y <prefijo>1.jpg, <prefijo>2.jpg ...
    let porNumero = new Map();
    let principal = '';
    if (prefijo) {
      porNumero = fotosNumeradas(carpetaFotos, prefijo, archivo, reporte);
      const re = new RegExp(`^${escapar(prefijo)}Principal\\.(${EXTENSIONES})$`, 'i');
      for (const f of listar(carpetaFotos).slice().sort()) {
        if (!re.test(f)) continue;
        if (principal) reporte.aviso(archivo, `hay dos fotos principales (${principal} y ${f}); se usa ${principal}`);
        else principal = f;
      }
      if (porNumero.size === 0) reporte.aviso(archivo, `no se encontraron fotos "${prefijo}N.jpg" en assets/images/${carpetaFotos}/`);
    } else {
      reporte.aviso(archivo, 'sin "prefijoFotos": el viaje no tendrá fotos');
    }
    const numerosOrdenados = [...porNumero.keys()].sort((a, b) => a - b);
    const ruta = (f) => `${carpetaFotos}/${f}`;
    const fotos = numerosOrdenados.map((n) => ruta(porNumero.get(n)));
    const portada = principal ? ruta(principal) : fotos[0] || '';
    if (prefijo && !principal) reporte.aviso(archivo, `no hay foto principal "${prefijo}Principal.jpg"; se usa la primera foto`);

    const usadas = new Set();
    const bloques = procesarBloques(v.bloques, { archivo, reporte, porNumero, rutaNumerada: ruta, hayMapa: !!v.mapa, usadas });

    // Fotos de la carpeta que no se han colocado en ningún bloque: salen al final automáticamente
    const fotosExtra = numerosOrdenados.filter((n) => !usadas.has(n)).map((n) => ruta(porNumero.get(n)));

    for (const p of v.personas || []) {
      if (!existsSync(join(IMAGENES, 'perfiles', `fotoPerfil${p}.jpg`))) reporte.aviso(archivo, `no existe la foto de perfil de "${p}" (assets/images/perfiles/fotoPerfil${p}.jpg)`);
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
    if (!f) reporte.aviso(`año ${anyo}`, `no hay portada del año (assets/images/${anyo}/Portada${anyo}.jpg)`);
    return { anyo, portada: f ? `${anyo}/${f}` : '' };
  });

  return { resumenes: resultado.map((r) => r.resumen), detalles: resultado.map((r) => r.detalle), anyos };
}
