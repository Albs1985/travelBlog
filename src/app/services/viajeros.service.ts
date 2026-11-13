import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Viajero } from '../interfaces/viajero.interface';
import { ViajeroContenido } from '../interfaces/contenido.interface';
import { ContenidoService } from './contenido.service';
import { calcularEdad } from './buscar.util';

/** Las personas de la familia (content/viajeros.json). La edad se calcula a partir de la fecha de nacimiento. */
@Injectable({ providedIn: 'root' })
export class ViajerosService {
  readonly viajeros$: Observable<Viajero[]> = this.contenido.coleccion<ViajeroContenido>('viajeros').pipe(
    map((lista) =>
      lista.map((v) => ({
        nombre: v.nombre,
        nombreCorto: v.nombre,
        nombreCompleto: v.nombreCompleto,
        nacimiento: v.nacimiento,
        aka: v.aka ?? [],
        fotoPerfil: v.fotoPerfil,
        edad: calcularEdad(v.nacimiento),
        info: v.info,
      }))
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  // --- Para las páginas que ya trabajaban con esta lista (juegos) ---
  viajerosLista: Viajero[] = [];
  cargando$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  constructor(private contenido: ContenidoService) {}

  cargarViajeros(): Promise<Viajero[]> {
    return firstValueFrom(this.viajeros$).then((lista) => {
      this.viajerosLista = lista;
      this.cargando$.next(false);
      return lista;
    });
  }
}
