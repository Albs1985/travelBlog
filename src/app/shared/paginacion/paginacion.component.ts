import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-paginacion',
  templateUrl: './paginacion.component.html',
  styleUrls: ['./paginacion.component.css']
})
export class PaginacionComponent {
  @Input() linkAnterior?: string | any[];
  @Input() textoAnterior: string = 'viaje.anterior';

  @Input() linkSiguiente?: string | any[];
  @Input() textoSiguiente: string = 'viaje.siguiente';

  @Input() claseIcono: string = 'animated fadeIn pulse iconoFlecha';
}
