/** Texto en varios idiomas: { es: '...', val: '...' }. Si falta un idioma se usa el otro. */
export type Texto = Record<string, string>;

/** Una foto de un viaje. `src` es relativo a assets/images/ (p. ej. "2019/Bali4.jpg"). */
export interface FotoViaje {
  src: string;
  desc?: Texto;
}

export interface BloqueTexto {
  tipo: 'titulo' | 'parrafo' | 'nota';
  texto: Texto;
}
export interface BloqueCita {
  tipo: 'cita';
  texto: Texto;
  autor?: Texto;
}
export interface BloqueMapa {
  tipo: 'mapa';
}
export interface BloqueFotos {
  tipo: 'fotos';
  fotos: FotoViaje[];
}
export type Bloque = BloqueTexto | BloqueCita | BloqueMapa | BloqueFotos;

/** Datos ligeros de un viaje (los del listado). Los genera scripts/build-data.mjs */
export interface ViajeResumen {
  id: string;
  archivo: string;
  anyo: number;
  fechaInicio: string;
  fechaFin: string;
  diaInicio: string;
  mesInicio: string;
  diaFin: string;
  mesFin: string;
  destino: string;
  categoria: string;
  provincia: string;
  pais: string;
  precio: number;
  estancia: string;
  tipoEstancia: string;
  transporte: string[];
  personas: string[];
  portada: string;
  fotos: string[];
  numFotos: number;
  anterior: string;
  siguiente: string;
}

/** Viaje completo (el que se carga al abrir un viaje). */
export interface Viaje extends ViajeResumen {
  mapa: string;
  infoInteres: string[];
  descPrincipal?: Texto;
  bloques: Bloque[];
  /** Fotos de la carpeta que no están colocadas en ningún bloque: se muestran al final. */
  fotosExtra: string[];
}

export interface AnyoViajes {
  anyo: number;
  portada: string;
}

export interface IndiceViajes {
  anyos: AnyoViajes[];
  viajes: ViajeResumen[];
}
