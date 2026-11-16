import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AutenticationService } from 'src/app/services/autentication.service';
import { ViajesService } from 'src/app/services/viajes.service';
import { ViajeResumen } from 'src/app/interfaces/viaje.interface';
import { CATEGORIAS_SLUG, iconoAlojamiento, iconoCategoria, iconoTransporte } from 'src/app/services/viajes.catalogo';

export type ModoLista = 'anyo' | 'categoria' | 'palabra';

/** Un viaje de la lista, con todo lo que la tarjeta necesita ya calculado. */
export interface Tarjeta {
  viaje: ViajeResumen;
  imagenes: string[];
  transporteIconos: string[];
  categoriaIcono: string;
  alojamientoIcono: string;
}

export interface VistaLista {
  modo: ModoLista;
  filtro: string;
  /** Icono de la categoría (solo en modo "categoria") */
  icono: string;
  tarjetas: Tarjeta[];
  anyoAnterior?: number;
  anyoSiguiente?: number;
}

/** Fotos que se enseñan en el carrusel de cada tarjeta (la portada + las primeras del viaje). */
const FOTOS_CARRUSEL = 3;

@Component({
  selector: 'app-viajes-por-anyo',
  templateUrl: './viajes-por-anyo.component.html',
  styleUrls: ['./viajes-por-anyo.component.css'],
})
export class ViajesPorAnyoComponent {
  /** true = se muestra del revés respecto al orden por defecto */
  invertido = false;

  readonly vista$: Observable<VistaLista> = combineLatest([
    this.route.paramMap.pipe(map((p) => p.get('filtro') ?? '')),
    this.servicioViajes.anyos$,
  ]).pipe(
    switchMap(([filtro, anyos]) => {
      const numero = Number(filtro);
      const esAnyo = filtro.trim() !== '' && Number.isInteger(numero);
      const esCategoria = CATEGORIAS_SLUG.includes(filtro);

      const viajes$ = esAnyo
        ? this.servicioViajes.porAnyo(numero)
        : esCategoria
        ? this.servicioViajes.porCategoria(filtro)
        : this.servicioViajes.buscar(filtro);

      return viajes$.pipe(
        map((viajes): VistaLista => {
          const i = anyos.findIndex((a) => a.anyo === numero);
          // Por año: cronológico. Por categoría o palabra: del más reciente al más antiguo.
          const ordenados = esAnyo ? viajes : [...viajes].reverse();
          return {
            modo: esAnyo ? 'anyo' : esCategoria ? 'categoria' : 'palabra',
            filtro,
            icono: esCategoria ? iconoCategoria(filtro) : '',
            tarjetas: ordenados.map((v) => this.tarjeta(v)),
            // anyos está ordenado de más reciente a más antiguo
            anyoAnterior: esAnyo && i >= 0 ? anyos[i + 1]?.anyo : undefined,
            anyoSiguiente: esAnyo && i > 0 ? anyos[i - 1]?.anyo : undefined,
          };
        })
      );
    })
  );

  constructor(
    private route: ActivatedRoute,
    public servicioViajes: ViajesService,
    public authenticationService: AutenticationService
  ) {}

  ordenar(): void {
    this.invertido = !this.invertido;
  }

  /** Aplica el orden elegido por el usuario. */
  ordenadas(tarjetas: Tarjeta[]): Tarjeta[] {
    return this.invertido ? [...tarjetas].reverse() : tarjetas;
  }

  ocultar(evento: Event): void {
    (evento.target as HTMLElement).style.display = 'none';
  }

  private tarjeta(v: ViajeResumen): Tarjeta {
    const imagenes = [v.portada, ...v.fotos.slice(0, FOTOS_CARRUSEL)].filter((f, i, todas) => f && todas.indexOf(f) === i);
    return {
      viaje: v,
      imagenes,
      transporteIconos: v.transporte.map(iconoTransporte).filter((i) => i !== ''),
      categoriaIcono: iconoCategoria(v.categoria),
      alojamientoIcono: iconoAlojamiento(v.tipoEstancia),
    };
  }
}
