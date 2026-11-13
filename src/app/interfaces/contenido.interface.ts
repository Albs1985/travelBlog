import { Bloque, FotoViaje, Texto } from './viaje.interface';

/** Las colecciones simples. Las genera scripts/build-data.mjs a partir de content/<nombre>.json */

export interface Frase {
  id: number;
  persona: string;
  fecha: string;
  frase: Texto;
  explicacion?: Texto;
}

export interface Dibujo {
  id: number;
  /** relativo a assets/images/ */
  src: string;
  persona: string;
  anyo?: number;
  edad?: number;
  detalle?: Texto;
}

export interface FotoFavorita {
  src: string;
  anyo: string;
  lugar?: string;
  etiquetas?: string;
  personas: string[];
  desc?: Texto;
}

export type TipoReceta = 'frio' | 'caliente' | 'dulce';
export type MetodoReceta = 'horno' | 'microondas' | 'olla' | 'nevera';

export interface Receta {
  id: number;
  nombre: Texto;
  frase?: Texto;
  categoria?: Texto;
  cocinero?: string;
  dificultad?: string;
  raciones?: number;
  tipos?: TipoReceta[];
  metodo?: MetodoReceta;
  tiempoPreparacion?: number;
  tiempoCoccion?: number;
  temperatura?: string | number;
  /** relativo a assets/images/ */
  imagen?: string;
  ingredientes: Texto[];
  utensilios?: Texto[];
  pasos: Texto[];
}

export interface PreguntaIdioma {
  pregunta: string;
  correcta: string;
  incorrectas: string[];
}
export interface PreguntaContenido {
  id: number;
  nivel: 'facil' | 'medio' | 'dificil';
  es: PreguntaIdioma;
  val: PreguntaIdioma;
}

export interface ViajeroContenido {
  nombre: string;
  nombreCompleto: string;
  nacimiento: string;
  aka?: string[];
  info?: Texto;
  fotoPerfil: string;
}

export interface Relato {
  slug: string;
  titulo: Texto;
  supra?: Texto;
  fecha?: Texto;
  icono: string;
  nacimiento?: string;
  /** usa la contraseña propia de los relatos de la familia */
  protegido: boolean;
  /** oculta el selector de idioma mientras se lee */
  sinIdioma: boolean;
  modoLibro: boolean;
  /** id de un viaje al que enlaza el final del relato */
  siguiente?: string;
  mapa: string;
  portada?: FotoViaje;
  bloques: Bloque[];
}
