import { Component } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Frase } from '../../interfaces/contenido.interface';
import { ContenidoService } from '../../services/contenido.service';
import { AutenticationService } from '../../services/autentication.service';
import { filtrar } from '../../services/buscar.util';

@Component({
  selector: 'app-frases',
  templateUrl: './frases.component.html',
  styleUrls: ['./frases.component.css']
})
export class FrasesComponent {
  p = 1; // Página actual
  pageSize = 10; // Elementos por página
  maxSizeDisplay = 10;

  private readonly termino$ = new BehaviorSubject<string>('');

  /** Las frases que cumplen la búsqueda (todas si no se busca nada). */
  readonly frases$: Observable<Frase[]> = combineLatest([this.contenido.coleccion<Frase>('frases'), this.termino$]).pipe(
    map(([frases, termino]) => filtrar(frases, termino, (f) => [f.persona, f.fecha, f.frase, f.explicacion]))
  );

  constructor(private contenido: ContenidoService, public authenticationService: AutenticationService) {}

  buscar(termino: string): void {
    this.p = 1;
    this.termino$.next(termino);
  }
}
