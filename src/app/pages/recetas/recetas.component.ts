import { Component } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Receta, TipoReceta } from '../../interfaces/contenido.interface';
import { ContenidoService } from '../../services/contenido.service';
import { AutenticationService } from '../../services/autentication.service';
import { filtrar } from '../../services/buscar.util';

export interface VistaRecetas {
  /** Recetas que cumplen el filtro */
  lista: Receta[];
  /** La receta abierta: la elegida, o la única que queda al filtrar */
  mostrada?: Receta;
}

@Component({
  selector: 'app-recetas',
  templateUrl: './recetas.component.html',
  styleUrls: ['./recetas.component.css']
})
export class RecetasComponent {
  /** Botones de tipo de receta: id, icono (assets/icons/<icono>.png y <icono>Selected.png) y textos */
  readonly tipos: { id: TipoReceta; icono: string; alt: string; etiqueta: string }[] = [
    { id: 'frio', icono: 'ingrediente', alt: 'frio', etiqueta: 'app.categoriaFrio' },
    { id: 'caliente', icono: 'frito', alt: 'caliente', etiqueta: 'app.categoriaCaliente' },
    { id: 'dulce', icono: 'pastel', alt: 'postre', etiqueta: 'app.categoriaDulce' },
  ];
  /** Tipo elegido ('' = todos) */
  tipo: TipoReceta | '' = '';

  private readonly termino$ = new BehaviorSubject<string>('');
  private readonly tipo$ = new BehaviorSubject<TipoReceta | ''>('');
  private readonly elegida$ = new BehaviorSubject<number | null>(null);

  readonly vista$: Observable<VistaRecetas> = combineLatest([
    this.contenido.coleccion<Receta>('recetas'),
    this.termino$,
    this.tipo$,
    this.elegida$,
  ]).pipe(
    map(([todas, termino, tipo, elegida]) => {
      const porTipo = tipo ? todas.filter((r) => r.tipos?.includes(tipo)) : todas;
      // Se busca en los dos idiomas: nombre, categoría, cocinero, ingredientes...
      const lista = filtrar(porTipo, termino, (r) => [r.nombre, r.categoria, r.cocinero, r.tipos, r.metodo, r.ingredientes]);
      const mostrada = elegida !== null ? todas.find((r) => r.id === elegida) : lista.length === 1 ? lista[0] : undefined;
      return { lista, mostrada };
    })
  );

  constructor(private contenido: ContenidoService, public authenticationService: AutenticationService) {}

  buscar(termino: string): void {
    this.tipo = '';
    this.tipo$.next('');
    this.elegida$.next(null);
    this.termino$.next(termino);
  }

  filtrarPorTipo(tipo: TipoReceta): void {
    this.tipo = tipo;
    this.tipo$.next(tipo);
    this.elegida$.next(null);
    this.termino$.next('');
  }

  verLista(): void {
    this.buscar('');
  }

  abrir(receta: Receta): void {
    this.elegida$.next(receta.id);
  }

  tiempoTotal(r: Receta): number {
    return (r.tiempoPreparacion ?? 0) + (r.tiempoCoccion ?? 0);
  }
}
