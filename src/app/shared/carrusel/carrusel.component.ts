import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-carrusel',
  templateUrl: './carrusel.component.html',
  styleUrls: ['./carrusel.component.css'],
})
export class CarruselComponent implements OnChanges, OnInit, OnDestroy {
  /** Rutas relativas a assets/images/ */
  @Input() imagenes: string[] = [];
  @Input() enlace: any[] = [];
  @Input() alt = '';

  /** Foto visible (para los puntos) */
  indice = 0;

  /**
   * true = el carrusel no se desliza con el dedo. Pasa mientras se hace zoom con dos dedos
   * y mientras la página está ampliada; así el gesto de zoom no cambia de foto.
   * Las flechas siguen funcionando.
   */
  bloqueado = false;

  private haciendoZoom = false;

  private readonly alCambiarZoom = (): void => {
    if (!this.haciendoZoom) {
      this.bloqueado = this.paginaAmpliada();
    }
  };

  ngOnInit(): void {
    window.visualViewport?.addEventListener('resize', this.alCambiarZoom);
  }

  ngOnDestroy(): void {
    window.visualViewport?.removeEventListener('resize', this.alCambiarZoom);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imagenes'] && this.imagenes?.length) {
      this.precargarImagenes(this.imagenes);
    }
  }

  /** Un segundo dedo en la pantalla = gesto de zoom: se bloquea el desplazamiento. */
  alTocar(evento: TouchEvent): void {
    if (evento.touches.length > 1) {
      this.haciendoZoom = true;
      this.bloqueado = true;
    }
  }

  /** Al levantar todos los dedos se espera un momento a que el navegador termine el zoom. */
  alSoltar(evento: TouchEvent): void {
    if (evento.touches.length === 0 && this.haciendoZoom) {
      setTimeout(() => {
        this.haciendoZoom = false;
        this.bloqueado = this.paginaAmpliada();
      }, 250);
    }
  }

  alDesplazar(pista: HTMLElement): void {
    this.indice = Math.round(pista.scrollLeft / (pista.clientWidth || 1));
  }

  mover(pista: HTMLElement, direccion: number): void {
    pista.scrollBy({ left: direccion * pista.clientWidth, behavior: 'smooth' });
  }

  ocultar(evento: Event): void {
    (evento.target as HTMLElement).style.display = 'none';
  }

  private paginaAmpliada(): boolean {
    return (window.visualViewport?.scale ?? 1) > 1.02;
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
