import { Component } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Dibujo } from '../../interfaces/contenido.interface';
import { FotoViaje } from '../../interfaces/viaje.interface';
import { ContenidoService } from '../../services/contenido.service';
import { AutenticationService } from '../../services/autentication.service';
import { filtrar } from '../../services/buscar.util';

@Component({
  selector: 'app-dibujos',
  templateUrl: './dibujos.component.html',
  styleUrls: ['./dibujos.component.css']
})
export class DibujosComponent {
  p = 1; // Página actual
  pageSize = 10; // Elementos por página
  maxSizeDisplay = 10;
  /** Posición del dibujo abierto en el visor (dentro de los dibujos filtrados); null = cerrado */
  abierto: number | null = null;

  private readonly termino$ = new BehaviorSubject<string>('');

  /** Los dibujos que cumplen la búsqueda, y esos mismos como fotos para el visor. */
  readonly vista$: Observable<{ dibujos: Dibujo[]; fotos: FotoViaje[] }> = combineLatest([
    this.contenido.coleccion<Dibujo>('dibujos'),
    this.termino$,
  ]).pipe(
    map(([todos, termino]) => {
      const dibujos = filtrar(todos, termino, (d) => [d.persona, d.anyo, d.edad, d.detalle]);
      return { dibujos, fotos: dibujos.map((d) => ({ src: d.src, desc: d.detalle })) };
    })
  );

  constructor(private contenido: ContenidoService, public authenticationService: AutenticationService) {}

  buscar(termino: string): void {
    this.p = 1;
    this.termino$.next(termino);
  }

  /** Posición real de un dibujo de la página actual dentro de la lista completa */
  posicion(indiceEnPagina: number): number {
    return (this.p - 1) * this.pageSize + indiceEnPagina;
  }
}
