import { Bloque, FotoViaje, Texto } from '../interfaces/viaje.interface';

/** Foto de un bloque, con su posición dentro del visor (lightbox). */
export interface FotoVista {
  foto: FotoViaje;
  idx: number;
}

export interface BloqueVista {
  tipo: Bloque['tipo'];
  texto?: Texto;
  autor?: Texto;
  titulo?: Texto;
  items?: Texto[];
  fotos?: FotoVista[];
}

export interface VistaBloques {
  bloques: BloqueVista[];
  extra: FotoVista[];
  /** Todas las fotos en el orden en que se ven en la página (para el visor). */
  galeria: FotoViaje[];
}

/**
 * Prepara los bloques para pintarlos: numera las fotos (para abrirlas en el visor) y
 * junta todas en `galeria`. `galeriaInicial` permite poner antes la foto de portada.
 */
export function prepararBloques(bloques: Bloque[], extra: string[] = [], galeriaInicial: FotoViaje[] = []): VistaBloques {
  const galeria: FotoViaje[] = [...galeriaInicial];
  const añadir = (foto: FotoViaje): FotoVista => {
    galeria.push(foto);
    return { foto, idx: galeria.length - 1 };
  };
  const vista: BloqueVista[] = bloques.map((b) => {
    switch (b.tipo) {
      case 'fotos':
        return { tipo: b.tipo, fotos: b.fotos.map(añadir) };
      case 'lista':
        return { tipo: b.tipo, titulo: b.titulo, items: b.items };
      case 'cita':
        return { tipo: b.tipo, texto: b.texto, autor: b.autor };
      case 'mapa':
        return { tipo: b.tipo };
      default:
        return { tipo: b.tipo, texto: b.texto };
    }
  });
  return { bloques: vista, extra: extra.map((src) => añadir({ src })), galeria };
}
