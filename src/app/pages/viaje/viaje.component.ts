import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ViajesService } from '../../services/viajes.service';
import { AutenticationService } from 'src/app/services/autentication.service';
import { Viaje } from '../../interfaces/viaje.interface';
import { VistaBloques, prepararBloques } from '../../services/bloques.util';
import { iconoAlojamiento, iconoCategoria, iconoTransporte } from '../../services/viajes.catalogo';
import { CommonService } from 'src/app/services/common.service';
import { GithubViajesService } from 'src/app/services/github-viajes.service';

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

  eliminando = false;
  mensajeAccion = '';

  /** null mientras carga; { viaje: undefined } no se usa: si no existe, `vista.viaje` es undefined. */
  readonly vista$: Observable<VistaViaje | { viaje: undefined }> = this.route.paramMap.pipe(
    map((p) => p.get('ciudad') ?? ''),
    switchMap((id) => this.servicioViajes.viaje(id)),
    map((viaje) => (viaje ? this.prepararVista(viaje) : { viaje: undefined }))
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public servicioViajes: ViajesService,
    public authenticationService: AutenticationService,
    public commonService: CommonService,
    private githubViajesService: GithubViajesService
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showMsg) {
      this.showMsg = false;
    }
  }

  edadViajero(persona: string, anyo?: number | string, mes?: number | string, dia?: number | string): number | null {
    const anyoNum = typeof anyo === 'number' ? anyo : parseInt(String(anyo ?? ''), 10);
    const mesNum = typeof mes === 'number' ? mes : parseInt(String(mes ?? ''), 10);
    const diaNum = typeof dia === 'number' ? dia : parseInt(String(dia ?? ''), 10);
    if (Number.isNaN(anyoNum)) {
      return null;
    }
    if (Number.isNaN(mesNum)) {
      return null;
    }
    if (Number.isNaN(diaNum)) {
      return null;
    }
    return this.commonService.calcularEdadEnAnyo(persona, anyoNum, mesNum, diaNum);
  }

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
  editarViaje(viaje: Viaje): void {
    const param = viaje.archivo || viaje.id;
    this.router.navigate(['/nuevo-viaje'], {
      queryParams: { editar: param },
      state: { viaje },
    });
  }

  eliminarViaje(viaje: Viaje): void {
    if (this.eliminando || !this.authenticationService.estaTokenGithubValido()) {
      return;
    }

    const segura = window.confirm(
      `¿Estás seguro de que quieres eliminar el viaje "${viaje.destino}" (${viaje.fechaInicio})? Esta acción borrará sus JSON, sus imágenes y actualizará index.json en GitHub.`
    );
    if (!segura) {
      return;
    }

    this.eliminando = true;
    this.mensajeAccion = 'Eliminando viaje en GitHub...';

    this.githubViajesService.eliminarViaje(viaje).subscribe({
      next: () => {
        this.eliminando = false;
        this.router.navigate(['/viajes']);
      },
      error: (err) => {
        this.eliminando = false;
        this.mensajeAccion = err?.message || 'No se pudo eliminar el viaje.';
      },
    });
  }
}
