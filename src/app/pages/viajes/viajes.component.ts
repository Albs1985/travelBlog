import { Component, OnInit } from '@angular/core';
import { ViajesService } from '../../services/viajes.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-viajes',
  templateUrl: './viajes.component.html',
  styleUrls: ['./viajes.component.css']
})
export class ViajesComponent implements OnInit{

  orderDesc : boolean;
  ejecutarSoloTouch: boolean;

  constructor(public servicioViajes : ViajesService,
    private route: ActivatedRoute,
    private translate: TranslateService){

    this.orderDesc = true;
    this.ejecutarSoloTouch = false;

  }
  ngOnInit(): void {
    this.servicioViajes.cargarViajes();
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
