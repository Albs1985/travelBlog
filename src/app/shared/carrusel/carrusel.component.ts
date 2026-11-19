import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-carrusel',
  templateUrl: './carrusel.component.html',
  styleUrls: ['./carrusel.component.css'],
})
export class CarruselComponent implements OnChanges {
  /** Rutas relativas a assets/images/ */
  @Input() imagenes: string[] = [];
  @Input() enlace: any[] = [];
  @Input() alt = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imagenes'] && this.imagenes?.length) {
      this.precargarImagenes(this.imagenes);
    }
  }

  mover(pista: HTMLElement, direccion: number): void {
    pista.scrollBy({ left: direccion * pista.clientWidth, behavior: 'smooth' });
  }

  ocultar(evento: Event): void {
    (evento.target as HTMLElement).style.display = 'none';
  }

  private precargarImagenes(rutas: string[]): void {
    for (const ruta of rutas) {
      if (!ruta) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = `assets/images/${ruta}`;
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
    }
  }
}
