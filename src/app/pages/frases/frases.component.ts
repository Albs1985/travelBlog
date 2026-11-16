import { Component } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Frase } from '../../interfaces/contenido.interface';
import { FrasesService } from '../../services/frases.service';
import { AutenticationService } from '../../services/autentication.service';

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
  readonly frases$: Observable<Frase[]> = this.termino$.pipe(
    switchMap((termino) => this.servicioFrases.buscar(termino)),
    map(frases => [...frases].sort((a, b) =>
      Number(b.fecha) - Number(a.fecha) || Number(b.id) - Number(a.id)
    ))
  );

  constructor(public servicioFrases: FrasesService, public authenticationService: AutenticationService) {}

  buscar(termino: string): void {
    this.p = 1;
    this.termino$.next(termino);
  }
}
