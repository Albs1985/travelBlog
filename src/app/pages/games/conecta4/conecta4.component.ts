import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PersonajeFamiliar {
  id: string;
  nombre: string;
  fotoUrl: string;
  color: string;
}

@Component({
  selector: 'app-conecta4',
  templateUrl: './conecta4.component.html',
  styleUrls: ['./conecta4.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class Conecta4Component {

  // Personajes disponibles de la familia
  public personajes: PersonajeFamiliar[] = [
    { id: 'albert', nombre: 'Albert', fotoUrl: 'assets/images/perfiles/fotoPerfilAlbert.jpg', color: '#4d7c0f' },
    { id: 'alba', nombre: 'Alba', fotoUrl: 'assets/images/perfiles/fotoPerfilAlba.jpg', color: '#be185d' },
    { id: 'mateu', nombre: 'Mateu', fotoUrl: 'assets/images/perfiles/fotoPerfilMateu.jpg', color: '#38a169' },
    { id: 'marina', nombre: 'Marina', fotoUrl: 'assets/images/perfiles/fotoPerfilMarina.jpg', color: '#d69e2e' }
  ];

  public jugador1: PersonajeFamiliar = this.personajes[0];
  public jugador2: PersonajeFamiliar = this.personajes[1];

  public juegoIniciado: boolean = false;
  public turnoJugador: number = 1; // 1 o 2

  // Tablero de 6 filas x 7 columnas (0 = vacío, 1 = jugador 1, 2 = jugador 2)
  public filas: number = 6;
  public columnas: number = 7;
  public tablero: number[][] = [];

  public ganador: PersonajeFamiliar | null = null;
  public esEmpate: boolean = false;

  public iniciarPartida(): void {
    if (this.jugador1.id === this.jugador2.id) {
      alert('¡Los dos jugadores deben ser personas diferentes!');
      return;
    }

    // Inicializar matriz vacía 6x7
    this.tablero = Array(this.filas).fill(0).map(() => Array(this.columnas).fill(0));
    this.turnoJugador = 1;
    this.ganador = null;
    this.esEmpate = false;
    this.juegoIniciado = true;
  }

  // Simular la gravedad al hacer clic en una columna
  public soltarFicha(colIndex: number): void {
    if (this.ganador || this.esEmpate) return;

    // Buscar desde la fila inferior hacia arriba la primera casilla vacía
    let filaSeleccionada = -1;
    for (let f = this.filas - 1; f >= 0; f--) {
      if (this.tablero[f][colIndex] === 0) {
        filaSeleccionada = f;
        break;
      }
    }

    // Si la columna está llena, no hacemos nada
    if (filaSeleccionada === -1) return;

    // Colocar la ficha
    this.tablero[filaSeleccionada][colIndex] = this.turnoJugador;

    // Comprobar si hay victoria
    if (this.verificarVictoria(filaSeleccionada, colIndex, this.turnoJugador)) {
      this.ganador = this.turnoJugador === 1 ? this.jugador1 : this.jugador2;
      return;
    }

    // Comprobar empate (si el tablero está lleno)
    if (this.verificarEmpate()) {
      this.esEmpate = true;
      return;
    }

    // Cambiar de turno
    this.turnoJugador = this.turnoJugador === 1 ? 2 : 1;
  }

  private verificarVictoria(row: number, col: number, jugador: number): boolean {
    const direcciones = [
      { r: 0, c: 1 },  // Horizontal (-)
      { r: 1, c: 0 },  // Vertical (|)
      { r: 1, c: 1 },  // Diagonal (\)
      { r: 1, c: -1 }  // Diagonal (/)
    ];

    for (const dir of direcciones) {
      let cuenta = 1;

      // Comprobar sentido positivo
      let r = row + dir.r;
      let c = col + dir.c;
      while (r >= 0 && r < this.filas && c >= 0 && c < this.columnas && this.tablero[r][c] === jugador) {
        cuenta++;
        r += dir.r;
        c += dir.c;
      }

      // Comprobar sentido negativo
      r = row - dir.r;
      c = col - dir.c;
      while (r >= 0 && r < this.filas && c >= 0 && c < this.columnas && this.tablero[r][c] === jugador) {
        cuenta++;
        r -= dir.r;
        c -= dir.c;
      }

      if (cuenta >= 4) return true;
    }

    return false;
  }

  private verificarEmpate(): boolean {
    return this.tablero.every(fila => fila.every(celda => celda !== 0));
  }

  public reiniciarConfiguracion(): void {
    this.juegoIniciado = false;
    this.ganador = null;
    this.esEmpate = false;
  }
}
