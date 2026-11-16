import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Frase } from '../interfaces/contenido.interface';
import { ContenidoService } from './contenido.service';
import { filtrar } from './buscar.util';

/**
 * Frases (content/frases.json). Se descargan una sola vez y se guardan en caché.
 * Cada frase tiene la forma de `Frase`: { id, persona, fecha, frase: Texto, explicacion?: Texto }
 * y los textos se muestran en el idioma activo con `{{ frase.frase | l10n }}`.
 */
@Injectable({ providedIn: 'root' })
export class FrasesService {
  /** Todas las frases, en el orden de content/frases.json. */
  readonly frases$: Observable<Frase[]> = this.contenido.coleccion<Frase>('frases');

  constructor(private contenido: ContenidoService) {}

  /**
   * Frases que cumplen la búsqueda (todas si el término está vacío).
   * No distingue mayúsculas ni acentos y busca en los dos idiomas:
   * persona, fecha, frase y explicación.
   */
  buscar(termino: string): Observable<Frase[]> {
    return this.frases$.pipe(
      map((frases) => filtrar(frases, termino, (f) => [f.persona, f.fecha, f.frase, f.explicacion]))
    );
  }
}
