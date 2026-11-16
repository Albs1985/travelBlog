import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ViajesService } from '../../services/viajes.service';
import { AutenticationService } from 'src/app/services/autentication.service';
import { Viaje } from '../../interfaces/viaje.interface';
import { VistaBloques, prepararBloques } from '../../services/bloques.util';
import { iconoAlojamiento, iconoCategoria, iconoTransporte } from '../../services/viajes.catalogo';

export interface VistaViaje extends VistaBloques {
  viaje: Viaje;
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
    // La foto de portada va la primera en el visor
    const portada = viaje.portada ? [{ src: viaje.portada, desc: viaje.descPrincipal }] : [];
    return {
      viaje,
      ...prepararBloques(viaje.bloques, viaje.fotosExtra, portada),
      transporteIconos: viaje.transporte.map(iconoTransporte).filter((i) => i !== ''),
      categoriaIcono: iconoCategoria(viaje.categoria),
      alojamientoIcono: viaje.tipoEstancia === 'Airbnb' ? '' : iconoAlojamiento(viaje.tipoEstancia),
    };
  }
}
