import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CommonService } from 'src/app/services/common.service';
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
  // mensajeCabeceraAnyo : boolean = true;
  // mensajeCabeceraFiltrar : boolean = false;
  // mensajeCabeceraAny : string = '';

  constructor(/*private route: ActivatedRoute, */
              public servicioViajes : ViajesService,
              private translate: TranslateService,
              private router: Router){

                // this.mensajeCabeceraAnyo = true;
                // this.mensajeCabeceraFiltrar = false;
                // this.mensajeCabecera = 'Viatges per any';

  }

  public changeLanguageToSpanish(): void {
    this.translate.use('es');
    // this.translate.use('es');/*ESTO IGUAL NO HACE FALTA HACERLO DOS VECES*/
    this.isSelectedSpanish = true;
    this.isSelectedValenciano = false;
    console.log('Idioma cambiado al Español');
    // this.mensajeCabecera = 'Viajes por año';
  }
  // Se cambia el idioma a Valenciano
  changeLanguageToValenciano(): void {
    this.translate.use('val');
    this.isSelectedSpanish = false;
    this.isSelectedValenciano = true;
    console.log('Idioma cambiado al Valenciano');
    // this.mensajeCabecera = 'Viatges per any';
  }

  buscar(){
    // console.log('Buscar por '+$('#myInput').val());
    if($('#myInput').val() == ''){
      return;
    } else {
      this.palabra = $('#myInput').val();
    }
    console.log("Busca por "+this.palabra);

    // this.mensajeCabeceraAnyo = false;
    // this.mensajeCabeceraFiltrar = true;
    // this.mensajeCabeceraAny = '';

    // this.mensajeCabecera = 'Filtramos por '+ this.palabra;
    this.servicioViajes.buscarViajes(this.palabra);
    this.router.navigate(['/viajesFiltrados/', this.palabra]);

  }
}
