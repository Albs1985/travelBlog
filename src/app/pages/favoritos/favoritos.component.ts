import { Component } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FotoFavorita } from '../../interfaces/contenido.interface';
import { FotoViaje } from '../../interfaces/viaje.interface';
import { ContenidoService } from '../../services/contenido.service';
import { ViajerosService } from '../../services/viajeros.service';
import { AutenticationService } from '../../services/autentication.service';
import { filtrar } from '../../services/buscar.util';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrls: ['./favoritos.component.css']
})
export class FavoritosComponent {
  /** false = como están en content/favoritos.json (las más nuevas primero); true = al revés */
  orderDesc = false;
  p = 1; // Página actual
  pageSize = 10; // Elementos por página
  maxSizeDisplay = 5; // Nº máximo de enlaces de página (mínimo 5)
  /** Posición de la foto abierta en el visor (dentro de las fotos filtradas); null = cerrado */
  abierta: number | null = null;

  private readonly termino$ = new BehaviorSubject<string>('');
  private readonly invertido$ = new BehaviorSubject<boolean>(false);

  /** Las fotos que cumplen la búsqueda, en el orden elegido, y esas mismas como fotos para el visor. */
  readonly vista$: Observable<{ fotos: FotoFavorita[]; visor: FotoViaje[] }> = combineLatest([
    this.contenido.coleccion<FotoFavorita>('favoritos'),
    this.termino$,
    this.invertido$,
  ]).pipe(
    map(([todas, termino, invertido]) => {
      const filtradas = filtrar(todas, termino, (f) => [f.anyo, f.lugar, f.etiquetas, f.personas, f.desc]);
      const fotos = invertido ? [...filtradas].reverse() : filtradas;
      return {
        fotos,
        visor: fotos.map((f) => ({ src: f.src, desc: f.desc })),
      };
    })
  );

  constructor(
    private contenido: ContenidoService,
    public viajerosService: ViajerosService,
    public authenticationService: AutenticationService
  ) {}

  buscar(termino: string): void {
    this.p = 1;
    this.termino$.next(termino);
  }

  ordenar(): void {
    this.orderDesc = !this.orderDesc;
    this.invertido$.next(this.orderDesc);
  }

  /** Posición real de una foto de la página actual dentro de la lista completa */
  posicion(indiceEnPagina: number): number {
    return (this.p - 1) * this.pageSize + indiceEnPagina;
  }
}
