import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { AnyoViajes, IndiceViajes, Viaje, ViajeResumen } from '../interfaces/viaje.interface';
import { slugCategoria, normalizar } from './viajes.catalogo';

/**
 * Acceso a los viajes. Los datos los genera `scripts/build-data.mjs` a partir de content/viajes/*.json:
 *   - index.json          -> resumen de todos los viajes (se descarga una sola vez y se guarda en caché)
 *   - viajes/<viaje>.json -> detalle de cada viaje (se descarga al abrirlo y se guarda en caché)
 */
@Injectable({ providedIn: 'root' })
export class ViajesService {
  private readonly base = 'assets/data/generated/';
  private readonly detalles = new Map<string, Observable<Viaje | undefined>>();

  private readonly indice$: Observable<IndiceViajes | undefined> = this.http
    .get<IndiceViajes>(this.base + 'index.json')
    .pipe(
      catchError((err) => {
        console.error('No se pudo cargar el índice de viajes', err);
        return of(undefined);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

  /** Todos los viajes en orden cronológico (del más antiguo al más reciente). */
  readonly viajes$: Observable<ViajeResumen[]> = this.indice$.pipe(map((i) => i?.viajes ?? []));

  /** Años con viajes, del más reciente al más antiguo, con su portada. */
  readonly anyos$: Observable<AnyoViajes[]> = this.indice$.pipe(map((i) => i?.anyos ?? []));

  /** true si el índice no se pudo cargar (para mostrar un mensaje de error). */
  readonly error$: Observable<boolean> = this.indice$.pipe(map((i) => i === undefined));

  /** Todas las fotos de todos los viajes, para la galería. */
  readonly fotosGaleria$: Observable<string[]> = this.viajes$.pipe(map((vs) => vs.flatMap((v) => v.fotos)));

  constructor(private http: HttpClient) {}

  /** Viajes de un año, en orden cronológico. */
  porAnyo(anyo: number): Observable<ViajeResumen[]> {
    return this.viajes$.pipe(map((vs) => vs.filter((v) => v.anyo === anyo)));
  }

  /** Viajes de una categoría (slug: playa, montanya, ciudad, nieve). */
  porCategoria(slug: string): Observable<ViajeResumen[]> {
    return this.viajes$.pipe(map((vs) => vs.filter((v) => slugCategoria(v.categoria) === slug)));
  }

  /** Busca por destino, provincia, país, categoría, personas, transporte, alojamiento o año. */
  buscar(termino: string): Observable<ViajeResumen[]> {
    const t = normalizar(termino);
    return this.viajes$.pipe(
      map((vs) =>
        t === ''
          ? vs
          : vs.filter((v) =>
              [
                v.destino, v.provincia, v.pais, v.categoria, slugCategoria(v.categoria),
                v.estancia, v.tipoEstancia, String(v.anyo), ...v.personas, ...v.transporte,
              ].some((campo) => normalizar(campo).includes(t))
            )
      )
    );
  }

  /** Un viaje completo por su id (fechaInicio_destino). `undefined` si no existe o no se pudo cargar. */
  viaje(id: string): Observable<Viaje | undefined> {
    let detalle$ = this.detalles.get(id);
    if (!detalle$) {
      detalle$ = this.indice$.pipe(
        map((i) => i?.viajes.find((v) => v.id === id)),
        switchMap((resumen) =>
          resumen
            ? this.http.get<Viaje>(`${this.base}viajes/${resumen.archivo}.json`).pipe(
                catchError((err) => {
                  console.error(`No se pudo cargar el viaje ${id}`, err);
                  return of(undefined);
                })
              )
            : of(undefined)
        ),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.detalles.set(id, detalle$);
    }
    return detalle$;
  }
}
