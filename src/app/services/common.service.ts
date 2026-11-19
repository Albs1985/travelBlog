import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface MiembroFamilia {
  nombre: string;
  fechaNacimiento: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CommonService {



  modoLibro$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  sinIdioma$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  modoJuegos$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  readonly miembrosFamilia: MiembroFamilia[] = [
    { nombre: 'Mateu', fechaNacimiento: new Date(2020, 8, 4) },   // 4 septiembre 2020
    { nombre: 'Marina', fechaNacimiento: new Date(2023, 6, 26) }, // 26 julio 2023
    { nombre: 'Alba', fechaNacimiento: new Date(1985, 4, 10) },   // 10 mayo 1985
    { nombre: 'Albert', fechaNacimiento: new Date(1985, 5, 6) },  // 6 junio 1985
  ];

  readonly nombresFamilia: string[] = this.miembrosFamilia.map((m) => m.nombre);


  constructor(private http: HttpClient) {  }

  obtenerFechaNacimiento(nombre: string): Date | undefined {
    const clave = this.normalizarNombre(nombre);
    return this.miembrosFamilia.find((m) => m.nombre === clave)?.fechaNacimiento;
  }

  /**
   * Calcula la edad en un año dado.
   * Si se pasan mes (1-12) y dia (1-31), comprueba si ya había cumplido años en esa fecha.
   */
  calcularEdadEnAnyo(nombre: string, anyo: number, mes?: number, dia?: number): number | null {
    const fechaNac = this.obtenerFechaNacimiento(nombre);
    if (!fechaNac || Number.isNaN(anyo)) {
      return null;
    }

    let edad = anyo - fechaNac.getFullYear();

    if (typeof mes === 'number' && !Number.isNaN(mes) && mes >= 1 && mes <= 12) {
      const mesNac = fechaNac.getMonth() + 1;
      const diaNac = fechaNac.getDate();
      const diaRef = typeof dia === 'number' && !Number.isNaN(dia) ? dia : 1;

      if (mes < mesNac || (mes === mesNac && diaRef < diaNac)) {
        edad -= 1;
      }
    }

    return Math.max(0, edad);
  }

  private normalizarNombre(nombre: string): string {
    const limpio = nombre.trim();
    if (!limpio) return '';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
  }

}
