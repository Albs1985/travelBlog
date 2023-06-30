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
  
  constructor(public servicioViajes : ViajesService,
    private translate: TranslateService){
    
    // translate.onLangChange.subscribe((event: LangChangeEvent) => {
      
    //   // console.log('CAMBIO DE IDIOMA ESCUCHADO POR EL PORTAFOLIO');
      
    // });
    
    this.servicioViajes.cargarViajes();
    this.orderDesc = false;
    // console.log('INICIALIZAMOS this.orderDesc='+this.orderDesc);

  }

  public ordenar(): void {
    // console.log('Vamos a ordenar. Está ordenado ascendente? '+this.orderDesc);
    this.orderDesc = !this.orderDesc;
    this.servicioViajes.viajesLista.reverse();    
  }

}
