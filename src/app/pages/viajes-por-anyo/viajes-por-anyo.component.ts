import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViajesService } from 'src/app/services/viajes.service';

@Component({
  selector: 'app-viajes-por-anyo',
  templateUrl: './viajes-por-anyo.component.html',
  styleUrls: ['./viajes-por-anyo.component.css']
})
export class ViajesPorAnyoComponent implements OnInit{

  anyoActual : number = new Date().getFullYear();
  anyoInicio : number = 2019;
  mensajeCabeceraAnyo : boolean = false;
  mensajeCabeceraFiltrar : boolean = false;
  palabra : string = '';
  mensajeCabeceraFiltrarSinTranslate : boolean = false;
  orderDesc : boolean;
  ejecutarSoloTouch : boolean;
  // viajesCargados : boolean = false;

  constructor (private route: ActivatedRoute,
                public servicioViajes : ViajesService){

                  this.orderDesc = false;
                  this.ejecutarSoloTouch = false;
  }

  ngOnInit(){

    this.route.params.subscribe(params =>{

      // console.log(params);
      var isNum = Number.isInteger(Number(params['filtro']));
      this.palabra = params['filtro'];
      // console.log(this.palabra);
      if (isNum){
        console.log('Filtramos por anyo');
        this.mensajeCabeceraAnyo = true;
        this.mensajeCabeceraFiltrar = false;
        this.mensajeCabeceraFiltrarSinTranslate = false;
        this.servicioViajes.cargarViajesPorAnyo(params);
      }else{
        console.log('Filtramos por palabra');

        switch (this.palabra) {
          case 'playa':
            this.mensajeCabeceraFiltrarSinTranslate = false;
            this.mensajeCabeceraAnyo = false;
            this.mensajeCabeceraFiltrar = true;
            break;
          case 'montanya':
            this.mensajeCabeceraFiltrarSinTranslate = false;
            this.mensajeCabeceraAnyo = false;
            this.mensajeCabeceraFiltrar = true;
            break;
          case 'ciudad':
            this.mensajeCabeceraFiltrarSinTranslate = false;
            this.mensajeCabeceraAnyo = false;
            this.mensajeCabeceraFiltrar = true;
            break;
          case 'nieve':
            this.mensajeCabeceraFiltrarSinTranslate = false;
            this.mensajeCabeceraAnyo = false;
            this.mensajeCabeceraFiltrar = true  ;
            break;
          default:
            this.mensajeCabeceraFiltrarSinTranslate = true;
            this.mensajeCabeceraAnyo = false;
            this.mensajeCabeceraFiltrar = false;
            break;
        }

        this.servicioViajes.buscarViajes(params);

      }

    });

    // this.viajesCargados = true;

  }

  public ordenar(eventType: string): void {

    //Para ejecutar sólo uno de los dos
    this.orderDesc = !this.orderDesc;
    if (eventType === 'click' && !this.ejecutarSoloTouch) {
      if (this.servicioViajes.viajesDetalleLista != null && this.servicioViajes.viajesDetalleLista.length > 0){
        this.servicioViajes.viajesDetalleLista.reverse();
      }else if (this.servicioViajes.viajesFiltrado != null && this.servicioViajes.viajesFiltrado.length > 0){
        this.servicioViajes.viajesFiltrado.reverse();
      }
    }else if (eventType === 'touchstart') {
      this.ejecutarSoloTouch  = true;
      if (this.servicioViajes.viajesDetalleLista != null && this.servicioViajes.viajesDetalleLista.length > 0){
        this.servicioViajes.viajesDetalleLista.reverse();
      }else if (this.servicioViajes.viajesFiltrado != null && this.servicioViajes.viajesFiltrado.length > 0){
        this.servicioViajes.viajesFiltrado.reverse();
      }
    }
  }

}
