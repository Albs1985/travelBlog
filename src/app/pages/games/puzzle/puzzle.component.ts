import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PiezaPuzzle {
  id: number;
  correctPos: number; // Posición ideal en el grid (0 hasta N*N - 1)
  currentPos: number | null; // null si está en la bandeja, o un número de índice del tablero
  rotacion: number;   // 0, 90, 180, 270
  bgX: number;
  bgY: number;
}

@Component({
  selector: 'app-puzzle',
  templateUrl: './puzzle.component.html',
  styleUrls: ['./puzzle.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PuzzleComponent implements OnInit, OnDestroy {

  // Configuraciones personalizables por el usuario
  public tamanoGrid: number = 3; // 3x3 (9 piezas), 4x4, 5x5, 6x6
  public permitirRotacion: boolean = true;

  public piezas: PiezaPuzzle[] = [];
  public totalFotosBoda: number = 22;
  public imagenActualUrl: string = '';

  public juegoIniciado: boolean = false;
  public juegoCompletado: boolean = false;
  public mostrarPista: boolean = false;

  public segundosTranscurridos: number = 0;
  private timerInterval: any;

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.detenerCronometro();
  }

  public iniciarJuego(): void {
    this.juegoCompletado = false;
    this.segundosTranscurridos = 0;
    this.mostrarPista = false;
    this.detenerCronometro();

    // Seleccionar foto aleatoria de Boda
    const numFoto = Math.floor(Math.random() * this.totalFotosBoda) + 1;
    this.imagenActualUrl = `assets/images/2019/Boda${numFoto}.jpg`;

    this.generarTablero();
    this.juegoIniciado = true;
    this.iniciarCronometro();
  }

  private generarTablero(): void {
    this.piezas = [];
    const totalPiezas = this.tamanoGrid * this.tamanoGrid;

    for (let i = 0; i < totalPiezas; i++) {
      const fila = Math.floor(i / this.tamanoGrid);
      const col = i % this.tamanoGrid;

      const bgX = (col / (this.tamanoGrid - 1)) * 100;
      const bgY = (fila / (this.tamanoGrid - 1)) * 100;

      const girosDisponibles = [0, 90, 180, 270];
      const rotacionInicial = this.permitirRotacion
        ? girosDisponibles[Math.floor(Math.random() * girosDisponibles.length)]
        : 0;

      this.piezas.push({
        id: i,
        correctPos: i,
        currentPos: null, // Al empezar, todas las piezas están fuera en la bandeja
        rotacion: rotacionInicial,
        bgX: isNaN(bgX) ? 0 : bgX,
        bgY: isNaN(bgY) ? 0 : bgY
      });
    }

    // Desordenar la bandeja inicial para que no salgan ordenadas
    this.piezas.sort(() => Math.random() - 0.5);
  }

  // --- DRAG AND DROP MÉTODOS ---

  public onDragStart(event: DragEvent, piezaId: number): void {
    event.dataTransfer?.setData('text/plain', piezaId.toString());
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault(); // Necesario para permitir soltar
  }

  // Soltar en una celda vacía o ocupada del tablero
  public onDropTablero(event: DragEvent, destinoIndex: number): void {
    event.preventDefault();
    if (this.juegoCompletado) return;

    const piezaIdStr = event.dataTransfer?.getData('text/plain');
    if (!piezaIdStr) return;
    const piezaId = parseInt(piezaIdStr, 10);

    // Comprobar si otra pieza ya ocupa esta celda del tablero
    const piezaEnDestino = this.piezas.find(p => p.currentPos === destinoIndex);
    const piezaMovida = this.piezas.find(p => p.id === piezaId);

    if (!piezaMovida) return;

    // Si había otra pieza en el destino, la mandamos a la bandeja (currentPos = null) o la intercambiamos
    if (piezaEnDestino && piezaEnDestino.id !== piezaMovida.id) {
      piezaEnDestino.currentPos = piezaMovida.currentPos; // Intercambio o retorno a bandeja
    }

    piezaMovida.currentPos = destinoIndex;
    this.verificarVictoria();
  }

  // Soltar de vuelta en la bandeja lateral/inferior
  public onDropBandeja(event: DragEvent): void {
    event.preventDefault();
    if (this.juegoCompletado) return;

    const piezaIdStr = event.dataTransfer?.getData('text/plain');
    if (!piezaIdStr) return;
    const piezaId = parseInt(piezaIdStr, 10);

    const piezaMovida = this.piezas.find(p => p.id === piezaId);
    if (piezaMovida) {
      piezaMovida.currentPos = null; // Vuelve a la bandeja
    }
  }

  // Obtener la pieza colocada en una celda concreta del tablero
  public getPiezaEnCelda(index: number): PiezaPuzzle | undefined {
    return this.piezas.find(p => p.currentPos === index);
  }

  // Obtener las piezas que siguen en la bandeja de reserva
  public get piezasEnBandeja(): PiezaPuzzle[] {
    return this.piezas.filter(p => p.currentPos === null);
  }

  // Girar pieza mediante clic si la rotación está habilitada
  public girarPieza(pieza: PiezaPuzzle, event: MouseEvent): void {
    event.preventDefault();
    if (!this.permitirRotacion || this.juegoCompletado) return;
    pieza.rotacion = (pieza.rotacion + 90) % 360;
    this.verificarVictoria();
  }

  private verificarVictoria(): void {
    const todoColocado = this.piezas.every(p => p.currentPos !== null);
    if (!todoColocado) return;

    const todoCorrecto = this.piezas.every(p => {
      const posicionCorrecta = p.currentPos === p.correctPos;
      const rotacionCorrecta = !this.permitirRotacion || p.rotacion === 0;
      return posicionCorrecta && rotacionCorrecta;
    });

    if (todoCorrecto) {
      this.finalizarJuego();
    }
  }

  private iniciarCronometro(): void {
    this.timerInterval = setInterval(() => {
      this.segundosTranscurridos++;
    }, 1000);
  }

  private detenerCronometro(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private finalizarJuego(): void {
    this.detenerCronometro();
    this.juegoCompletado = true;
  }

  public formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${segs < 10 ? '0' : ''}${segs}`;
  }
}
