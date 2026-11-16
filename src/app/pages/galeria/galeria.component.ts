import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AutenticationService } from 'src/app/services/autentication.service';
import { ViajesService } from 'src/app/services/viajes.service';
import { FotoViaje } from 'src/app/interfaces/viaje.interface';

@Component({
  selector: 'app-galeria',
  templateUrl: './galeria.component.html',
  styleUrls: ['./galeria.component.css']
})
export class GaleriaComponent {
  p = 1; // Página inicial
  pageSize = 10; // Elementos por página
  maxSizeDisplay = 5;
  /** Posición (dentro de todas las fotos) de la foto abierta en el visor; null = cerrado */
  fotoAbierta: number | null = null;

  /** Todas las fotos de todos los viajes. Salen solas de las carpetas de imágenes. */
  readonly fotos$: Observable<FotoViaje[]> = this.viajesService.fotosGaleria$.pipe(
    map((fotos) => fotos.map((src) => ({ src })))
  );

  constructor(public viajesService: ViajesService, public authenticationService: AutenticationService) {}

  /** Posición real de una foto de la página actual dentro de la lista completa */
  posicion(indiceEnPagina: number): number {
    return (this.p - 1) * this.pageSize + indiceEnPagina;
  }
}
