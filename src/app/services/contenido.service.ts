import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { Relato } from '../interfaces/contenido.interface';

/**
 * Carga de contenido generado por scripts/build-data.mjs (src/assets/data/generated/).
 * Cada colección se descarga una sola vez y se guarda en caché.
 *
 *   frases$ = this.contenido.coleccion<Frase>('frases');
 */
@Injectable({ providedIn: 'root' })
export class ContenidoService {
  private readonly base = 'assets/data/generated/';
  private readonly cache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) {}

  /** Una colección (lista) por su nombre: 'frases', 'dibujos', 'favoritos', 'recetas', 'preguntas', 'viajeros'. */
  coleccion<T>(nombre: string): Observable<T[]> {
    return this.cargar<T[]>(`${nombre}.json`, []);
  }

  /** Un relato por su nombre (el de la ruta /historias/<nombre>). `undefined` si no existe. */
  relato(slug: string): Observable<Relato | undefined> {
    return this.cargar<Relato | undefined>(`relatos/${slug}.json`, undefined);
  }

  private cargar<T>(archivo: string, valorSiFalla: T): Observable<T> {
    let obs = this.cache.get(archivo);
    if (!obs) {
      obs = this.http.get<T>(this.base + archivo).pipe(
        catchError((err) => {
          console.error(`No se pudo cargar ${archivo}`, err);
          return of(valorSiFalla);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.cache.set(archivo, obs);
    }
    return obs;
  }
}
