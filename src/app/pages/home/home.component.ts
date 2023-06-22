import { Component } from '@angular/core';
import { ViajesService } from '../../services/viajes.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  constructor(public servicioViajes : ViajesService,
    private translate: TranslateService){
    
    // translate.onLangChange.subscribe((event: LangChangeEvent) => {
      
    //   // console.log('CAMBIO DE IDIOMA ESCUCHADO POR EL PORTAFOLIO');
      
    // });
    
    this.servicioViajes.cargarViajes();

  }

}
