import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { TablerosService } from 'src/app/services/tableros.service';

@Component({
  selector: 'app-tableros',
  templateUrl: './tableros.component.html',
  styleUrls: ['./tableros.component.css']
})
export class TablerosComponent implements OnInit, OnDestroy {

  destroy$: Subject<void> = new Subject<void>();
  listaJuegos: { nombre: string, numJugadores: string, rutaImagen: string }[] = [];
  juegoSeleccionado: { nombre: string; numJugadores: string; rutaImagen: string; } | undefined;

  numDados: number = 1;
  lanzandoDados: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  resultadoDados: number[] | null = null;

  constructor(public servicioTableros: TablerosService){  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(){
    this.servicioTableros.getTableros().pipe(takeUntil(this.destroy$)).subscribe((tableros) => {
      this.listaJuegos = tableros.map(tablero => ({
        nombre: tablero.nombreJuego,
        numJugadores: tablero.numJugadores,
        rutaImagen: tablero.rutaImagen
      }));
    });
  }

  seleccionarJuego(event: Event): void {
    const juegoSel = (event.target as HTMLSelectElement).value;
    const juego = this.listaJuegos.find(juego => juego.nombre === juegoSel);
    if (juego) {
      this.juegoSeleccionado = juego;
    }
  }

  lanzarDados(): void {
    this.lanzandoDados.next(true);
    // Simular tiempo de lanzamiento (3 segundos)
    setTimeout(() => {
      this.resultadoDados = [];
      for (let i = 0; i < this.numDados; i++) {
        this.resultadoDados.push(this.generarNumeroAleatorio(1, 6));
      }
      this.lanzandoDados.next(false);
    }, 2000);
  }

  generarNumeroAleatorio(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  reiniciar(): void {
    this.resultadoDados = null;
  }
}
