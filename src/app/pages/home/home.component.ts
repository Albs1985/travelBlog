import { Component } from '@angular/core';
import { ViajesService } from '../../services/viajes.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  orderDesc : boolean;
  ejecutarSoloTouch: boolean;
  
  constructor(public servicioViajes : ViajesService,
    private translate: TranslateService){
    
    this.servicioViajes.cargarViajes();
    this.orderDesc = false;
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
