import { Component, OnInit } from '@angular/core';
import { ViajesService } from '../../services/viajes.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { Viajes } from 'src/app/interfaces/viajes.interface';

@Component({
  selector: 'app-viajes',
  templateUrl: './viajes.component.html',
  styleUrls: ['./viajes.component.css']
})
export class ViajesComponent{

  orderDesc : boolean;
  ejecutarSoloTouch: boolean;
  viajesListado : Viajes[] = [];

  constructor(public servicioViajes : ViajesService,
    private route: ActivatedRoute,
    private translate: TranslateService){

    this.orderDesc = true;
    this.ejecutarSoloTouch = false;
    this.servicioViajes.cargarViajes();
  }
  // ngOnInit(): void {
  //   this.servicioViajes.cargarViajes();
  // }

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
