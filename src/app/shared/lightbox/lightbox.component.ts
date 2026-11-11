import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FotoViaje } from '../../interfaces/viaje.interface';

/**
 * Visor de fotos a pantalla completa.
 * Flechas / teclado (← → Esc) / deslizar el dedo para pasar de foto.
 *
 *   <app-lightbox *ngIf="abierta !== null" [fotos]="fotos" [indice]="abierta" (cerrar)="abierta = null"></app-lightbox>
 */
@Component({
  selector: 'app-lightbox',
  templateUrl: './lightbox.component.html',
  styleUrls: ['./lightbox.component.css'],
})
export class LightboxComponent implements OnInit, OnDestroy {
  @Input() fotos: FotoViaje[] = [];
  @Input() indice = 0;
  @Output() cerrar = new EventEmitter<void>();

  private inicioX = 0;

  get actual(): FotoViaje | undefined {
    return this.fotos[this.indice];
  }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden'; // la página de detrás no se desplaza
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  ir(delta: number, evento?: Event): void {
    evento?.stopPropagation();
    const n = this.fotos.length;
    if (n > 0) this.indice = (this.indice + delta + n) % n;
  }

  @HostListener('document:keydown', ['$event'])
  teclas(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.cerrar.emit();
    else if (e.key === 'ArrowLeft') this.ir(-1);
    else if (e.key === 'ArrowRight') this.ir(1);
  }

  tocarInicio(e: TouchEvent): void {
    this.inicioX = e.changedTouches[0].clientX;
  }

  tocarFin(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.inicioX;
    if (Math.abs(dx) > 50) this.ir(dx < 0 ? 1 : -1);
  }
}
