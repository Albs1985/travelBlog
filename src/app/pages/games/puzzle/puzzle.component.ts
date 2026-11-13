import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PiezaPuzzleNormal {
  id: number;
  currentPos: number; // Posición actual en el grid
  correctPos: number; // Posición donde debería estar
  rotacion: number;   // 0, 90, 180, 270 grados
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

  // Configuración de niveles
  public nivelSeleccionado: number = 2; // 2 = Fácil (2x2), 3 = Normal (3x3), 4 = Difícil (4x4)
  public piezas: PiezaPuzzleNormal[] = [];

  // Imagen de Boda (2019) del 1 al 20 por ejemplo
  public totalFotosBoda: number = 20;
  public imagenActualUrl: string = '';

  public juegoIniciado: boolean = false;
  public juegoCompletado: boolean = false;
  public segundosTranscurridos: number = 0;
  private timerInterval: any;
  public piezaSeleccionadaIndex: number | null = null; // Para intercambiar posiciones en niveles altos

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.detenerCronometro();
  }

  public iniciarJuego(): void {
    this.juegoCompletado = false;
    this.segundosTranscurridos = 0;
    this.detenerCronometro();
    this.piezaSeleccionadaIndex = null;

    // Seleccionar foto aleatoria de Boda
    const numFoto = Math.floor(Math.random() * this.totalFotosBoda) + 1;
    this.imagenActualUrl = `assets/images/2019/Boda${numFoto}.jpg`;

    this.generarTablero();
    this.mezclarTablero();

    this.juegoIniciado = true;
    this.iniciarCronometro();
  }

  private generarTablero(): void {
    this.piezas = [];
    const totalPiezas = this.nivelSeleccionado * this.nivelSeleccionado;

    for (let i = 0; i < totalPiezas; i++) {
      const fila = Math.floor(i / this.nivelSeleccionado);
      const col = i % this.nivelSeleccionado;

      const bgX = (col / (this.nivelSeleccionado - 1)) * 100;
      const bgY = (fila / (this.nivelSeleccionado - 1)) * 100;

      this.piezas.push({
        id: i,
        currentPos: i,
        correctPos: i,
        rotacion: 0,
        bgX: isNaN(bgX) ? 0 : bgX,
        bgY: isNaN(bgY) ? 0 : bgY
      });
    }
  }

  private mezclarTablero(): void {
    // 1. Rotaciones aleatorias para todos los niveles
    this.piezas.forEach(p => {
      const girosAleatorios = [0, 90, 180, 270];
      // En nivel fácil (2x2), aseguramos que al menos algunas tengan giros
      p.rotacion = girosAleatorios[Math.floor(Math.random() * girosAleatorios.length)];
    });

    // 2. Si es nivel 3x3 o 4x4, desordenamos también las posiciones de las piezas
    if (this.nivelSeleccionado > 2) {
      for (let i = this.piezas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Intercambiar currentPos
        const tempPos = this.piezas[i].currentPos;
        this.piezas[i].currentPos = this.piezas[j].currentPos;
        this.piezas[j].currentPos = tempPos;
      }
    }
  }

  // Clic simple: Gira la pieza 90 grados
  public girarPieza(index: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.juegoCompletado || !this.juegoIniciado) return;

    // Encontrar la pieza en el grid actual
    const pieza = this.piezas.find(p => p.currentPos === index);
    if (pieza) {
      pieza.rotacion = (pieza.rotacion + 90) % 360;
      this.verificarVictoria();
    }
  }

  // Intercambiar posiciones entre dos piezas (para niveles 3x3 y 4x4)
  public seleccionarParaIntercambiar(index: number): void {
    if (this.nivelSeleccionado === 2 || this.juegoCompletado || !this.juegoIniciado) return;

    if (this.piezaSeleccionadaIndex === null) {
      this.piezaSeleccionadaIndex = index;
    } else {
      // Intercambiar posiciones actuales
      const p1 = this.piezas.find(p => p.currentPos === this.piezaSeleccionadaIndex);
      const p2 = this.piezas.find(p => p.currentPos === index);

      if (p1 && p2) {
        const temp = p1.currentPos;
        p1.currentPos = p2.currentPos;
        p2.currentPos = temp;
      }

      this.piezaSeleccionadaIndex = null;
      this.verificarVictoria();
    }
  }

  // Ordenar las piezas visualmente en el grid según su currentPos
  public get piezasOrdenadasGrid(): PiezaPuzzleNormal[] {
    const copia = [...this.piezas];
    copia.sort((a, b) => a.currentPos - b.currentPos);
    return copia;
  }

  private verificarVictoria(): void {
    const todoCorrecto = this.piezas.every(p => p.currentPos === p.correctPos && p.rotacion === 0);
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
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
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
