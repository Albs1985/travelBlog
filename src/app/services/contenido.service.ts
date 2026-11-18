import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, Observable, of } from "rxjs";
import { Relato } from "../interfaces/contenido.interface";

@Injectable({ providedIn: 'root' })
export class ContenidoService {
  private readonly base = 'assets/data/';
  private readonly cache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) {}

  coleccion<T>(nombre: string): Observable<T[]> {
    return this.cargar<T[]>(`${nombre}.json`, []);
  }

  relato(slug: string): Observable<Relato | undefined> {
    return this.cargar<Relato | undefined>(`relatos/${slug}.json`, undefined);
  }

  invalidarCache(nombre: string): void {
    // Al borrarlo del Map, obligamos a que la próxima petición vuelva a hacer un GET real
    this.cache.delete(`${nombre}.json`);
  }

  private cargar<T>(archivo: string, valorSiFalla: T): Observable<T> {
    let obs = this.cache.get(archivo);
    if (!obs) {
      // Cabeceras HTTP estrictas para evitar que el navegador cachee el JSON
      const headers = new HttpHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Añadimos un timestamp aleatorio para evitar la caché estática de assets
      const timestamp = new Date().getTime();
      const urlConCacheBusting = `${this.base}${archivo}?v=${timestamp}`;

      obs = this.http.get<T>(urlConCacheBusting, { headers }).pipe(
        catchError((err) => {
          console.error(`No se pudo cargar ${archivo}`, err);
          return of(valorSiFalla);
        })
        // OJO: Quitamos el shareReplay aquí para que no congrile la respuesta en memoria local
      );
      this.cache.set(archivo, obs);
    }
    return obs;
  }
}
