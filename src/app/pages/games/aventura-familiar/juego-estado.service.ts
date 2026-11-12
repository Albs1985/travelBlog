import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PersonajeFamiliar, RecordFamiliar } from './juego.models';

export type PantallaJuego = 'SELECCION' | 'JUGANDO' | 'NIVEL_COMPLETADO' | 'VICTORIA' | 'GAME_OVER';

@Injectable()
export class JuegoEstadoService {
  private pantallaSubject = new BehaviorSubject<PantallaJuego>('SELECCION');
  pantalla$ = this.pantallaSubject.asObservable();

  private personajeSeleccionadoSubject = new BehaviorSubject<PersonajeFamiliar | null>(null);
  personajeSeleccionado$ = this.personajeSeleccionadoSubject.asObservable();

  nivelActual = 1;
  puntuacion = 0;
  vidas = 3;
  recordFamiliar: RecordFamiliar | null = null;

  constructor() {
    this.cargarRecord();
  }

  seleccionarPersonaje(personaje: PersonajeFamiliar): void {
    this.personajeSeleccionadoSubject.next(personaje);
    this.vidas = personaje.vidasIniciales;
    this.puntuacion = 0;
    this.nivelActual = 1;
    this.cambiarPantalla('JUGANDO');
  }

  sumarPuntos(puntos: number): void {
    this.puntuacion += puntos;
    this.verificarNuevoRecord();
  }

  perderVida(): boolean {
    this.vidas--;
    if (this.vidas <= 0) {
      this.verificarNuevoRecord();
      this.cambiarPantalla('GAME_OVER');
      return true;
    }
    return false;
  }

  completarNivel(): void {
    this.verificarNuevoRecord();
    if (this.nivelActual < 3) {
      this.nivelActual++;
      this.cambiarPantalla('NIVEL_COMPLETADO');
    } else {
      this.cambiarPantalla('VICTORIA');
    }
  }

  continuarSiguienteNivel(): void {
    this.cambiarPantalla('JUGANDO');
  }

  cambiarPantalla(pantalla: PantallaJuego): void {
    this.pantallaSubject.next(pantalla);
  }

  reiniciar(): void {
    this.personajeSeleccionadoSubject.next(null);
    this.cambiarPantalla('SELECCION');
  }

  private cargarRecord(): void {
    try {
      const guardado = localStorage.getItem('aventura_familiar_record');
      if (guardado) {
        this.recordFamiliar = JSON.parse(guardado);
      }
    } catch {}
  }

  private verificarNuevoRecord(): void {
    const jugador = this.personajeSeleccionadoSubject.value;
    if (!jugador) return;

    if (!this.recordFamiliar || this.puntuacion > this.recordFamiliar.puntos) {
      this.recordFamiliar = {
        nombre: jugador.nombre,
        puntos: this.puntuacion,
        fecha: new Date().toLocaleDateString()
      };
      try {
        localStorage.setItem('aventura_familiar_record', JSON.stringify(this.recordFamiliar));
      } catch {}
    }
  }
}
