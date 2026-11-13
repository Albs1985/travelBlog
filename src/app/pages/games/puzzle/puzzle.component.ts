import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PersonajeFamiliar {
  id: string;
  nombre: string;
  rol: string;
  fotoUrl: string;
  colorRopa: string;
}

export interface PiezaPuzle {
  currentPos: number;
  correctPos: number;
  bgX: number;
  bgY: number;
  isEmpty: boolean;
}

export interface RecordTiempos {
  personaje: string;
  nivel: string;
  tiempoSegundos: number;
  fecha: string;
}

@Component({
  selector: 'app-puzzle',
  templateUrl: './puzzle.component.html',
  styleUrls: ['./puzzle.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PuzzleComponent implements OnInit, OnDestroy {

  public personajes: PersonajeFamiliar[] = [
    { id: 'albert', nombre: 'Albert', rol: 'El Explorador', fotoUrl: 'assets/images/perfiles/fotoPerfilAlbert.jpg', colorRopa: '#4d7c0f' },
    { id: 'alba', nombre: 'Alba', rol: 'La Estratega', fotoUrl: 'assets/images/perfiles/fotoPerfilAlba.jpg', colorRopa: '#be185d' },
    { id: 'mateu', nombre: 'Mateu', rol: 'El Veloz', fotoUrl: 'assets/images/perfiles/fotoPerfilMateu.jpg', colorRopa: '#38a169' },
    { id: 'marina', nombre: 'Marina', rol: 'La Saltarina', fotoUrl: 'assets/images/perfiles/fotoPerfilMarina.jpg', colorRopa: '#d69e2e' }
  ];

  public personajeSeleccionado: PersonajeFamiliar = this.personajes[0];

  // Años disponibles (centrados especialmente en 2019 para Bali)
  public aniosDisponibles: number[] = [2019];
  public anioSeleccionado: number = 2019; // Por defecto 2019 para las fotos de Bali

  public tamanoGrid: number = 3; // 3x3 o 4x4
  public piezas: PiezaPuzle[] = [];

  public juegoIniciado: boolean = false;
  public juegoCompletado: boolean = false;
  public movimientos: number = 0;
  public segundosTranscurridos: number = 0;
  private timerInterval: any;

  public records: RecordTiempos[] = [];
  public imagenActualUrl: string = '';

  ngOnInit(): void {
    this.cargarRecords();
  }

  ngOnDestroy(): void {
    this.detenerCronometro();
  }

  // Método que selecciona aleatoriamente una imagen de Bali (Bali1 a Bali33) dentro de la carpeta del año
  public obtenerRutaImagen(): string {
    if (!this.imagenActualUrl) {
      // Generar un número aleatorio entre 1 y 33
      const numeroBali = Math.floor(Math.random() * 33) + 1;
      this.imagenActualUrl = `assets/images/${this.anioSeleccionado}/Bali${numeroBali}.jpg`;
    }
    return this.imagenActualUrl;
  }

  public iniciarJuego(): void {
    this.juegoCompletado = false;
    this.movimientos = 0;
    this.segundosTranscurridos = 0;
    this.detenerCronometro();

    // Resetear la imagen para que elija una nueva foto de Bali aleatoria en cada partida
    this.imagenActualUrl = '';

    this.generarTablero();
    this.mezclarTablero();

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

      this.piezas.push({
        currentPos: i,
        correctPos: i,
        bgX: isNaN(bgX) ? 0 : bgX,
        bgY: isNaN(bgY) ? 0 : bgY,
        isEmpty: i === totalPiezas - 1
      });
    }
  }

  private mezclarTablero(): void {
    for (let i = 0; i < 100 * this.tamanoGrid; i++) {
      const vaciaIndex = this.piezas.findIndex(p => p.isEmpty);
      const vecinas = this.obtenerIndicesVecinos(vaciaIndex);
      const randomVecina = vecinas[Math.floor(Math.random() * vecinas.length)];

      this.intercambiarPiezas(vaciaIndex, randomVecina);
    }
    this.movimientos = 0;
  }

  private obtenerIndicesVecinos(index: number): number[] {
    const vecinos: number[] = [];
    const fila = Math.floor(index / this.tamanoGrid);
    const col = index % this.tamanoGrid;

    if (fila > 0) vecinos.push(index - this.tamanoGrid);
    if (fila < this.tamanoGrid - 1) vecinos.push(index + this.tamanoGrid);
    if (col > 0) vecinos.push(index - 1);
    if (col < this.tamanoGrid - 1) vecinos.push(index + 1);

    return vecinos;
  }

  public moverPieza(index: number): void {
    if (this.juegoCompletado || !this.juegoIniciado) return;

    const vaciaIndex = this.piezas.findIndex(p => p.isEmpty);
    if (this.esVecino(index, vaciaIndex)) {
      this.intercambiarPiezas(index, vaciaIndex);
      this.movimientos++;

      if (this.verificarVictoria()) {
        this.finalizarJuego();
      }
    }
  }

  private esVecino(i1: number, i2: number): boolean {
    const f1 = Math.floor(i1 / this.tamanoGrid);
    const c1 = i1 % this.tamanoGrid;
    const f2 = Math.floor(i2 / this.tamanoGrid);
    const c2 = i2 % this.tamanoGrid;

    return (Math.abs(f1 - f2) + Math.abs(c1 - c2)) === 1;
  }

  private intercambiarPiezas(i1: number, i2: number): void {
    const temp = this.piezas[i1];
    this.piezas[i1] = this.piezas[i2];
    this.piezas[i2] = temp;

    this.piezas[i1].currentPos = i1;
    this.piezas[i2].currentPos = i2;
  }

  private verificarVictoria(): boolean {
    return this.piezas.every(p => p.currentPos === p.correctPos);
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
    this.guardarRecord();
  }

  private guardarRecord(): void {
    const nuevoRecord: RecordTiempos = {
      personaje: this.personajeSeleccionado.nombre,
      nivel: `${this.tamanoGrid}x${this.tamanoGrid}`,
      tiempoSegundos: this.segundosTranscurridos,
      fecha: new Date().toLocaleDateString()
    };

    this.records.push(nuevoRecord);
    this.records.sort((a, b) => a.tiempoSegundos - b.tiempoSegundos);
    localStorage.setItem('familia_puzzle_records', JSON.stringify(this.records));
  }

  private cargarRecords(): void {
    const guardados = localStorage.getItem('familia_puzzle_records');
    if (guardados) {
      this.records = JSON.parse(guardados);
    }
  }

  public formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${segs < 10 ? '0' : ''}${segs}`;
  }
}
