import { Component } from '@angular/core';
import { ViajesService } from '../../services/viajes.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-viajes',
  templateUrl: './viajes.component.html',
  styleUrls: ['./viajes.component.css']
})
export class ViajesComponent {

  orderDesc : boolean;
  ejecutarSoloTouch: boolean;

  constructor(public servicioViajes : ViajesService,
    private route: ActivatedRoute,
    private translate: TranslateService){

    this.servicioViajes.cargarViajes();
    this.orderDesc = true;
    this.ejecutarSoloTouch = false;

  }

  public ordenar(eventType: string): void {

    // console.log('eventType - '+eventType);
    if (eventType === 'click' && !this.ejecutarSoloTouch) {
      this.servicioViajes.viajesLista.reverse();
    } else if (eventType === 'touchstart') {
      this.ejecutarSoloTouch = true;
      this.servicioViajes.viajesLista.reverse();
    }
    this.orderDesc = !this.orderDesc;
  }
}
