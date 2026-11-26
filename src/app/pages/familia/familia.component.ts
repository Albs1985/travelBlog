import { AfterViewInit, Component, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Página única de la familia: apodos, cumpleaños y frases.
 * Cada sección es el componente de siempre (app-apodos, app-cumpleanos, app-frases), así que la
 * lógica no cambia. Se puede llegar a una sección concreta con /familia?seccion=frases
 * (valores: apodos, cumpleanos, frases).
 */
@Component({
  selector: 'app-familia',
  templateUrl: './familia.component.html',
  styleUrls: ['./familia.component.css']
})
export class FamiliaComponent implements AfterViewInit {
  constructor(private route: ActivatedRoute, private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const seccion = params.get('seccion');
      if (seccion) {
        setTimeout(() => this.ir(seccion), 250);
      }
    });
  }

  ir(seccion: string): void {
    this.host.nativeElement
      .querySelector(`#seccion-${seccion}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
