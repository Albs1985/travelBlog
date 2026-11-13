import { Texto } from './viaje.interface';

export interface Viajero {
  nombre: string;
  nombreCorto: string;
  nombreCompleto: string;
  nacimiento: string;
  aka: string[];
  fotoPerfil: string;
  /** Se calcula a partir de la fecha de nacimiento */
  edad: number;
  info?: Texto;
}
