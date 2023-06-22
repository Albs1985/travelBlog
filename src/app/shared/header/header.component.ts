import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ViajesService } from 'src/app/services/viajes.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  palabra : any;
  isSelectedSpanish : boolean = false;
  isSelectedValenciano : boolean = true;

  constructor(private route: ActivatedRoute, 
              public servicioViajes : ViajesService, 
              private translate: TranslateService,
              private router: Router){   

  }

  public changeLanguageToSpanish(): void {
    this.translate.use('es');
    // this.translate.use('es');/*ESTO IGUAL NO HACE FALTA HACERLO DOS VECES*/
    this.isSelectedSpanish = true;
    this.isSelectedValenciano = false;
    console.log('Idioma cambiado al Español');    
  }
  // Se cambia el idioma a Valenciano
  changeLanguageToValenciano(): void {
    this.translate.use('val');    
    this.isSelectedSpanish = false;
    this.isSelectedValenciano = true;
    console.log('Idioma cambiado al Valenciano');
  }

  buscar(){
    // console.log('Buscar por '+$('#myInput').val());
    if($('#myInput').val() == ''){
      return;
    } else {
      this.palabra = $('#myInput').val();
    }
    console.log("Busca por "+this.palabra);
    
    this.servicioViajes.buscarViaje(this.palabra);
    this.router.navigate(['/viajesFiltrados/', this.palabra]);

  }
}
