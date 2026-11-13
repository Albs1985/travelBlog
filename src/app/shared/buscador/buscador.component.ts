import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Caja de búsqueda de las páginas de listas (frases, dibujos, favoritos, recetas).
 * Emite el texto al pulsar la lupa o Enter; vacío = quitar el filtro.
 *
 *   <app-buscador [placeholder]="'app.frasesFiltrado' | translate" (buscar)="termino$.next($event)"></app-buscador>
 */
@Component({
  selector: 'app-buscador',
  templateUrl: './buscador.component.html',
  styleUrls: ['./buscador.component.css'],
})
export class BuscadorComponent {
  @Input() placeholder = '';
  /** Sin el margen superior negativo (para páginas donde el buscador va más abajo) */
  @Input() sinMargenSuperior = false;
  @Output() buscar = new EventEmitter<string>();

  texto = '';

  enviar(evento?: Event): void {
    evento?.preventDefault();
    this.buscar.emit(this.texto.trim());
  }
}
