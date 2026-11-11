import { Component, Input } from '@angular/core';

/**
 * Carrusel ligero de fotos (sin jQuery ni Bootstrap): se desliza con el dedo en el móvil
 * y con las flechas en el ordenador. Cada foto es un enlace a `enlace`.
 *
 *   <app-carrusel [imagenes]="v.fotosCarrusel" [enlace]="['/viaje', v.id]"></app-carrusel>
 */
@Component({
  selector: 'app-carrusel',
  templateUrl: './carrusel.component.html',
  styleUrls: ['./carrusel.component.css'],
})
export class CarruselComponent {
  /** Rutas relativas a assets/images/ */
  @Input() imagenes: string[] = [];
  @Input() enlace: any[] = [];
  @Input() alt = '';

  mover(pista: HTMLElement, direccion: number): void {
    pista.scrollBy({ left: direccion * pista.clientWidth, behavior: 'smooth' });
  }

  ocultar(evento: Event): void {
    (evento.target as HTMLElement).style.display = 'none';
  }
}
