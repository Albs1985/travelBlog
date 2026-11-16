import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Ciudad {
  id: string;
  nombre: string;
  x: number; // Coordenada X en porcentaje (0-100)
  y: number; // Coordenada Y en porcentaje (0-100)
}

export interface Ruta {
  id: string;
  origen: string;
  destino: string;
  longitud: number; // Número de casillas de tren que ocupa
  color: string;
  propietario: number | null; // null, 1 o 2
}

export interface Jugador {
  id: number;
  nombre: string;
  avatar: string;
  puntos: number;
  trenesRestantes: number;
  cartasTransporte: { [tipo: string]: number };
  objetivos: { origen: string; destino: string; puntos: number; completado: boolean }[];
}

@Component({
  selector: 'app-ticket-tren',
  templateUrl: './ticket-tren.component.html',
  styleUrls: ['./ticket-tren.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TicketTrenComponent implements OnInit {

  public modoDificultad: 'ninos' | 'adultos' = 'ninos';
  public juegoIniciado: boolean = false;
  public juegoTerminado: boolean = false;

  public listaAvatares = [
    { nombre: 'Alba', url: 'assets/images/perfiles/fotoPerfilAlba.jpg' },
    { nombre: 'Albert', url: 'assets/images/perfiles/fotoPerfilAlbert.jpg' },
    { nombre: 'Mateu', url: 'assets/images/perfiles/fotoPerfilMateu.jpg' },
    { nombre: 'Marina', url: 'assets/images/perfiles/fotoPerfilMarina.jpg' }
  ];

  public configJugador1 = { nombre: 'Albert', avatar: 'assets/images/perfiles/fotoPerfilAlbert.jpg' };
  public configJugador2 = { nombre: 'Alba', avatar: 'assets/images/perfiles/fotoPerfilAlba.jpg' };

  public turnoActual: number = 1;
  public jugadores: Jugador[] = [];
  public mensajeEstado: string = '';

  // Mapa de Ciudades de España
  public ciudades: Ciudad[] = [
    { id: 'madrid', nombre: 'Madrid', x: 48, y: 52 },
    { id: 'barcelona', nombre: 'Barcelona', x: 80, y: 35 },
    { id: 'valencia', nombre: 'Valencia', x: 70, y: 62 },
    { id: 'sevilla', nombre: 'Sevilla', x: 30, y: 82 },
    { id: 'bilbao', nombre: 'Bilbao', x: 45, y: 22 },
    { id: 'malaga', nombre: 'Málaga', x: 42, y: 88 },
    { id: 'zaragoza', nombre: 'Zaragoza', x: 62, y: 38 },
    { id: 'santiago', nombre: 'Santiago', x: 18, y: 25 }
  ];

  // Rutas que conectan el mapa con longitudes reales de casillas
  public rutas: Ruta[] = [
    { id: 'r1', origen: 'madrid', destino: 'barcelona', longitud: 3, color: '#3b82f6', propietario: null },
    { id: 'r2', origen: 'madrid', destino: 'valencia', longitud: 2, color: '#ef4444', propietario: null },
    { id: 'r3', origen: 'madrid', destino: 'sevilla', longitud: 3, color: '#10b981', propietario: null },
    { id: 'r4', origen: 'madrid', destino: 'bilbao', longitud: 2, color: '#f59e0b', propietario: null },
    { id: 'r5', origen: 'barcelona', destino: 'zaragoza', longitud: 2, color: '#8b5cf6', propietario: null },
    { id: 'r6', origen: 'zaragoza', destino: 'bilbao', longitud: 2, color: '#ec4899', propietario: null },
    { id: 'r7', origen: 'sevilla', destino: 'malaga', longitud: 1, color: '#06b6d4', propietario: null },
    { id: 'r8', origen: 'valencia', destino: 'barcelona', longitud: 2, color: '#64748b', propietario: null },
    { id: 'r9', origen: 'madrid', destino: 'santiago', longitud: 4, color: '#d97706', propietario: null }
  ];

  ngOnInit(): void {}

  public iniciarPartida(): void {
    if (this.configJugador1.nombre === this.configJugador2.nombre) {
      alert('¡Elige dos jugadores diferentes!');
      return;
    }

    this.jugadores = [
      {
        id: 1,
        nombre: this.configJugador1.nombre,
        avatar: this.configJugador1.avatar,
        puntos: 0,
        trenesRestantes: 25, // Fichas visibles de vagones
        cartasTransporte: { 'tren': 4, 'coche': 4, 'avion': 2 },
        objetivos: [
          { origen: 'madrid', destino: 'barcelona', puntos: 10, completado: false },
          { origen: 'sevilla', destino: 'bilbao', puntos: 15, completado: false }
        ]
      },
      {
        id: 2,
        nombre: this.configJugador2.nombre,
        avatar: this.configJugador2.avatar,
        puntos: 0,
        trenesRestantes: 25,
        cartasTransporte: { 'tren': 4, 'coche': 4, 'avion': 2 },
        objetivos: [
          { origen: 'valencia', destino: 'santiago', puntos: 15, completado: false },
          { origen: 'madrid', destino: 'malaga', puntos: 10, completado: false }
        ]
      }
    ];

    this.rutas.forEach(r => r.propietario = null);
    this.turnoActual = 1;
    this.juegoIniciado = true;
    this.juegoTerminado = false;
    this.actualizarMensaje();
  }

  public reclamarRuta(ruta: Ruta): void {
    if (this.juegoTerminado || ruta.propietario !== null) return;

    const jugador = this.jugadores[this.turnoActual - 1];

    if (jugador.trenesRestantes < ruta.longitud) {
      alert('¡No te quedan suficientes trenes para reclamar esta ruta!');
      return;
    }

    // Ocupar ruta y descontar trenes visibles
    ruta.propietario = this.turnoActual;
    jugador.trenesRestantes -= ruta.longitud;

    // Asignar puntos según longitud
    const puntosRuta = [0, 1, 3, 6, 10, 15][ruta.longitud] || (ruta.longitud * 2);
    jugador.puntos += puntosRuta;

    this.comprobarObjetivos(jugador);

    // Fin de partida si un jugador se queda sin trenes
    if (jugador.trenesRestantes <= 2) {
      this.juegoTerminado = true;
      return;
    }

    // Cambiar turno
    this.turnoActual = this.turnoActual === 1 ? 2 : 1;
    this.actualizarMensaje();
  }

  public robarCartas(): void {
    const jugador = this.jugadores[this.turnoActual - 1];
    jugador.cartasTransporte['tren'] += 2;
    this.turnoActual = this.turnoActual === 1 ? 2 : 1;
    this.actualizarMensaje();
  }

  private comprobarObjetivos(jugador: Jugador): void {
    jugador.objetivos.forEach(obj => {
      if (!obj.completado) {
        const conectado = this.rutas.some(r =>
          r.propietario === jugador.id &&
          ((r.origen === obj.origen && r.destino === obj.destino) ||
           (r.origen === obj.destino && r.destino === obj.origen))
        );
        if (conectado) {
          obj.completado = true;
          jugador.puntos += obj.puntos;
        }
      }
    });
  }

  public getCiudad(id: string): Ciudad {
    return this.ciudades.find(c => c.id === id)!;
  }

  public getRutasCasillas(ruta: Ruta): number[] {
    return Array(ruta.longitud).fill(0);
  }

  private actualizarMensaje(): void {
    const j = this.jugadores[this.turnoActual - 1];
    this.mensajeEstado = `Es el turno de ${j.nombre}. ¡Elige una ruta en el mapa o roba cartas!`;
  }
}
