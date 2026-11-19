import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
export class BloquesComponent implements OnChanges {
  @Input() bloques: BloqueVista[] = [];
  /** Fotos que no están en ningún bloque: se enseñan al final, en "Más fotos" */
  @Input() extra: FotoVista[] = [];
  @Input() mapa = '';
  @Input() alt = '';
  @Output() abrir = new EventEmitter<number>();

  private rutasPrecargadas = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bloques'] || changes['extra']) {
      this.precargarFotos();
    }
  }

  ocultar(evento: Event): void {
    (evento.target as HTMLElement).style.display = 'none';
  }

  private precargarFotos(): void {
    const rutas: string[] = [];

    for (const b of this.bloques ?? []) {
      if (b.tipo === 'fotos' && b.fotos?.length) {
        for (const f of b.fotos) {
          if (f.foto?.src) rutas.push(f.foto.src);
        }
      }
    }

    for (const f of this.extra ?? []) {
      if (f.foto?.src) rutas.push(f.foto.src);
    }

    for (const ruta of rutas) {
      if (this.rutasPrecargadas.has(ruta)) continue;
      this.rutasPrecargadas.add(ruta);

      const img = new Image();
      img.decoding = 'async';
      img.src = `assets/images/${ruta}`;
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
    }
  }
}
