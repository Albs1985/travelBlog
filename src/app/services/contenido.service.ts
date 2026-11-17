import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { Relato } from '../interfaces/contenido.interface';

@Injectable({ providedIn: 'root' })
export class ContenidoService {
  private readonly base = 'assets/data/generated/';
  private readonly cache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) {}

  /** Una colección (lista) por su nombre: 'frases', 'dibujos', etc. */
  coleccion<T>(nombre: string): Observable<T[]> {
    return this.cargar<T[]>(`${nombre}.json`, []);
  }

  /** Un relato por su nombre. */
  relato(slug: string): Observable<Relato | undefined> {
    return this.cargar<Relato | undefined>(`relatos/${slug}.json`, undefined);
  }

  /** Invalida la caché de una colección para forzar su recarga */
  invalidarCache(nombre: string): void {
    this.cache.delete(`${nombre}.json`);
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
