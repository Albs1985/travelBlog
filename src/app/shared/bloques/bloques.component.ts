import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BloqueVista, FotoVista } from '../../services/bloques.util';

/**
 * Pinta una lista de bloques de contenido (título, párrafo, foto, cita, nota, lista, mapa).
 * La usan los viajes y los relatos. Las fotos se abren en el visor: el padre recibe (abrir) con la
 * posición de la foto dentro de `galeria` (ver prepararBloques en services/bloques.util.ts).
 *
 *   <app-bloques [bloques]="vista.bloques" [extra]="vista.extra" [mapa]="viaje.mapa" (abrir)="foto = $event"></app-bloques>
 */
@Component({
  selector: 'app-bloques',
  templateUrl: './bloques.component.html',
  styleUrls: ['./bloques.component.css'],
})
export class BloquesComponent {
  @Input() bloques: BloqueVista[] = [];
  /** Fotos que no están en ningún bloque: se enseñan al final, en "Más fotos" */
  @Input() extra: FotoVista[] = [];
  @Input() mapa = '';
  @Input() alt = '';
  @Output() abrir = new EventEmitter<number>();
}
