import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Ciudad {
  id: string;
  nombre: string;
  x: number; // Porcentaje para posicionar en el mapa SVG/CSS
  y: number;
}

export interface Ruta {
  id: string;
  origen: string;
  destino: string;
  longitud: number;
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

  // Configuración de partida
  public modoDificultad: 'ninos' | 'adultos' = 'ninos';
  public juegoIniciado: boolean = false;
  public rondaFinal: boolean = false;
  public juegoTerminado: boolean = false;

  // Avatares de la familia disponibles
  public listaAvatares = [
    { nombre: 'Alba', url: 'assets/images/perfiles/fotoPerfilAlba.jpg' },
    { nombre: 'Albert', url: 'assets/images/perfiles/fotoPerfilAlbert.jpg' },
    { nombre: 'Mateu', url: 'assets/images/perfiles/fotoPerfilMateu.jpg' },
    { nombre: 'Marina', url: 'assets/images/perfiles/fotoPerfilMarina.jpg' }
  ];

  public configJugador1 = { nombre: 'Albert', avatar: 'assets/images/perfiles/fotoPerfilAlbert.jpg' };
  public configJugador2 = { nombre: 'Alba', avatar: 'assets/images/perfiles/fotoPerfilAlba.jpg' };

  public turnoActual: number = 1; // 1 o 2
  public jugadores: Jugador[] = [];
  public mensajeEstado: string = '';

  // Mapa de Ciudades del Viaje Familiar
  public ciudades: Ciudad[] = [
    { id: 'barcelona', nombre: 'Barcelona', x: 20, y: 30 },
    { id: 'madrid', nombre: 'Madrid', x: 50, y: 25 },
    { id: 'valencia', nombre: 'Valencia', x: 35, y: 60 },
    { id: 'bali', nombre: 'Bali (Viaje)', x: 80, y: 80 },
    { id: 'pueblo', nombre: 'El Pueblo', x: 75, y: 30 },
    { id: 'camping', nombre: 'El Camping', x: 50, y: 75 }
  ];

  // Rutas que conectan las ciudades
  public rutas: Ruta[] = [
    { id: 'r1', origen: 'barcelona', destino: 'madrid', longitud: 3, color: '#3b82f6', propietario: null },
    { id: 'r2', origen: 'barcelona', destino: 'valencia', longitud: 2, color: '#ef4444', propietario: null },
    { id: 'r3', origen: 'madrid', destino: 'valencia', longitud: 2, color: '#10b981', propietario: null },
    { id: 'r4', origen: 'madrid', destino: 'camping', longitud: 3, color: '#f59e0b', propietario: null },
    { id: 'r5', origen: 'valencia', destino: 'camping', longitud: 1, color: '#8b5cf6', propietario: null },
    { id: 'r6', origen: 'camping', destino: 'bali', longitud: 4, color: '#ec4899', propietario: null },
    { id: 'r7', origen: 'pueblo', destino: 'bali', longitud: 2, color: '#06b6d4', propietario: null },
    { id: 'r8', origen: 'madrid', destino: 'pueblo', longitud: 2, color: '#64748b', propietario: null }
  ];

  ngOnInit(): void {}

  public iniciarPartida(): void {
    if (this.configJugador1.nombre === this.configJugador2.nombre) {
      alert('¡Por favor, elige dos jugadores diferentes!');
      return;
    }

    // Inicializar jugadores con recursos según nivel
    this.jugadores = [
      {
        id: 1,
        nombre: this.configJugador1.nombre,
        avatar: this.configJugador1.avatar,
        puntos: 0,
        trenesRestantes: this.modoDificultad === 'ninos' ? 20 : 15,
        cartasTransporte: { 'tren': 5, 'coche': 5, 'avion': 3 },
        objetivos: [
          { origen: 'barcelona', destino: 'bali', puntos: 15, completado: false },
          { origen: 'madrid', destino: 'pueblo', puntos: 10, completado: false }
        ]
      },
      {
        id: 2,
        nombre: this.configJugador2.nombre,
        avatar: this.configJugador2.avatar,
        puntos: 0,
        trenesRestantes: this.modoDificultad === 'ninos' ? 20 : 15,
        cartasTransporte: { 'tren': 5, 'coche': 5, 'avion': 3 },
        objetivos: [
          { origen: 'valencia', destino: 'pueblo', puntos: 12, completado: false },
          { origen: 'barcelona', destino: 'camping', puntos: 10, completado: false }
        ]
      }
    ];

    // Resetear rutas
    this.rutas.forEach(r => r.propietario = null);
    this.turnoActual = 1;
    this.juegoIniciado = true;
    this.rondaFinal = false;
    this.juegoTerminado = false;
    this.actualizarMensaje();
  }

  public reclamarRuta(ruta: Ruta): void {
    if (this.juegoTerminado || ruta.propietario !== null) return;

    const jugador = this.jugadores[this.turnoActual - 1];

    // Si es modo adultos, comprobar si tiene suficientes trenes
    if (jugador.trenesRestantes < ruta.longitud) {
      alert('¡No te quedan suficientes fichas de viajero para esta ruta!');
      return;
    }

    // Capturar ruta
    ruta.propietario = this.turnoActual;
    jugador.trenesRestantes -= ruta.longitud;

    // Asignar puntos por longitud (1->1, 2->3, 3->6, 4->10)
    const puntosRuta = [0, 1, 3, 6, 10][ruta.longitud] || (ruta.longitud * 2);
    jugador.puntos += puntosRuta;

    this.comprobarObjetivos(jugador);

    // Comprobar si se acaba la partida
    if (jugador.trenesRestantes <= 3 && !this.rondaFinal) {
      this.rondaFinal = true;
    }

    if (this.rondaFinal && this.turnoActual === 2) {
      this.finalizarJuego();
      return;
    }

    // Cambiar turno
    this.turnoActual = this.turnoActual === 1 ? 2 : 1;
    this.actualizarMensaje();
  }

  public robarCartasExtra(): void {
    const jugador = this.jugadores[this.turnoActual - 1];
    jugador.cartasTransporte['tren'] += 2;
    // Cambiar turno tras robar
    this.turnoActual = this.turnoActual === 1 ? 2 : 1;
    this.actualizarMensaje();
  }

  private comprobarObjetivos(jugador: Jugador): void {
    jugador.objetivos.forEach(obj => {
      if (!obj.completado) {
        // Validación simplificada de conexión directa o compartida
        const conexionDirecta = this.rutas.some(r => 
          r.propietario === jugador.id && 
          ((r.origen === obj.origen && r.destino === obj.destino) || 
           (r.origen === obj.destino && r.destino === obj.origen))
        );
        if (conexionDirecta) {
          obj.completado = true;
          jugador.puntos += obj.puntos;
        }
      }
    });
  }

  private actualizarMensaje(): void {
    const j = this.jugadores[this.turnoActual - 1];
    this.mensajeEstado = `Turno de ${j.nombre} (${this.modoDificultad === 'ninos' ? 'Modo Niños' : 'Modo Adultos'})`;
  }

  private finalizarJuego(): void {
    this.juegoTerminado = true;
  }

  public getNombreCiudad(id: string): string {
    return this.ciudades.find(c => c.id === id)?.nombre || id;
  }
}