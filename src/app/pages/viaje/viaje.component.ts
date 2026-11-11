import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ViajesService } from '../../services/viajes.service';
import { AutenticationService } from 'src/app/services/autentication.service';
import { Bloque, FotoViaje, Texto, Viaje } from '../../interfaces/viaje.interface';
import { iconoAlojamiento, iconoCategoria, iconoTransporte } from '../../services/viajes.catalogo';

/** Foto de un bloque, con su posición dentro del visor (lightbox). */
export interface FotoVista {
  foto: FotoViaje;
  idx: number;
}

export interface BloqueVista {
  tipo: Bloque['tipo'];
  texto?: Texto;
  autor?: Texto;
  fotos?: FotoVista[];
}

export interface VistaViaje {
  viaje: Viaje;
  bloques: BloqueVista[];
  extra: FotoVista[];
  /** Todas las fotos del viaje en el orden en que se ven en la página (para el visor). */
  galeria: FotoViaje[];
  transporteIconos: string[];
  categoriaIcono: string;
  alojamientoIcono: string;
}

@Component({
  selector: 'app-viaje',
  templateUrl: './viaje.component.html',
  styleUrls: ['./viaje.component.css'],
})
export class ViajeComponent {
  showMsg = false;
  /** Posición de la foto abierta en el visor; null = cerrado. */
  fotoAbierta: number | null = null;

  /** null mientras carga; { viaje: undefined } no se usa: si no existe, `vista.viaje` es undefined. */
  readonly vista$: Observable<VistaViaje | { viaje: undefined }> = this.route.paramMap.pipe(
    map((p) => p.get('ciudad') ?? ''),
    switchMap((id) => this.servicioViajes.viaje(id)),
    map((viaje) => (viaje ? this.prepararVista(viaje) : { viaje: undefined }))
  );

  constructor(
    private route: ActivatedRoute,
    public servicioViajes: ViajesService,
    public authenticationService: AutenticationService
  ) {}

  showTooltip(): void {
    this.showMsg = !this.showMsg;
  }

  esVista(v: VistaViaje | { viaje: undefined }): v is VistaViaje {
    return v.viaje !== undefined;
  }

  ocultar(evento: Event): void {
    (evento.target as HTMLElement).style.display = 'none';
  }

  private prepararVista(viaje: Viaje): VistaViaje {
    const galeria: FotoViaje[] = [];
    if (viaje.portada) galeria.push({ src: viaje.portada, desc: viaje.descPrincipal });

    const añadir = (foto: FotoViaje): FotoVista => {
      galeria.push(foto);
      return { foto, idx: galeria.length - 1 };
    };

    const bloques: BloqueVista[] = viaje.bloques.map((b) =>
      b.tipo === 'fotos'
        ? { tipo: b.tipo, fotos: b.fotos.map(añadir) }
        : { tipo: b.tipo, texto: 'texto' in b ? b.texto : undefined, autor: b.tipo === 'cita' ? b.autor : undefined }
    );
    const extra = viaje.fotosExtra.map((src) => añadir({ src }));

    return {
      viaje,
      bloques,
      extra,
      galeria,
      transporteIconos: viaje.transporte.map(iconoTransporte).filter((i) => i !== ''),
      categoriaIcono: iconoCategoria(viaje.categoria),
      alojamientoIcono: viaje.tipoEstancia === 'Airbnb' ? '' : iconoAlojamiento(viaje.tipoEstancia),
    };
  }
}
