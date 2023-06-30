import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FotosService } from 'src/app/services/fotos.service';
import { ViajesService } from 'src/app/services/viajes.service';
import { HeaderComponent } from 'src/app/shared/header/header.component';

@Component({
  selector: 'app-viajes-por-anyo',
  templateUrl: './viajes-por-anyo.component.html',
  styleUrls: ['./viajes-por-anyo.component.css']
})
export class ViajesPorAnyoComponent implements OnInit{

  mensajeCabeceraAnyo : boolean = false;
  mensajeCabeceraFiltrar : boolean = false;
  palabra : string = '';
  mensajeCabeceraFiltrarSinTranslate : boolean = false;
  orderDesc : boolean;

  constructor (private route: ActivatedRoute,
                public servicioViajes : ViajesService){
                  
                  this.orderDesc = false;
  }

  ngOnInit(){

    this.route.params.subscribe(params =>{
      
      console.log(params);
      // console.log('ALBERT');
      // console.log(params['filtro']);
      
      var isNum = Number.isInteger(Number(params['filtro']));
      this.palabra = params['filtro'];
      console.log(this.palabra);
      if (isNum){
        console.log('Filtramos por anyo');
        this.mensajeCabeceraAnyo = true;
        this.mensajeCabeceraFiltrar = false;
        this.mensajeCabeceraFiltrarSinTranslate = false;  
        this.servicioViajes.cargarViajesPorAnyo(params);
        // this.cabeceraComp.mensajeCabeceraAny = params['filtro'];
        // console.log(this.cabeceraComp.mensajeCabeceraAny);
      }else{
        console.log('Filtramos por palabra');
        // this.mensajeCabeceraAnyo = false;
        // this.mensajeCabeceraFiltrar = true; 
        // this.mensajeCabeceraFiltrarSinTranslate = false; 

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
        
        // this.cabeceraComp.mensajeCabeceraAny = params['filtro'];
        // console.log(this.cabeceraComp.mensajeCabeceraAny);

        // this.servicioFotos.cargarFotos(this.servicioViajes.viajesDetalleLista[0].destino+'_'+this.servicioViajes.viajesDetalleLista[0].fechaInicio);

      }

    }); 

  }

  public ordenar(): void {
    // console.log('Vamos a ordenar. Está ordenado ascendente? '+this.orderDesc);
    this.orderDesc = !this.orderDesc;
    if (this.servicioViajes.viajesDetalleLista != null && this.servicioViajes.viajesDetalleLista.length > 0){
      this.servicioViajes.viajesDetalleLista.reverse();
    }
    if (this.servicioViajes.viajesFiltrado != null && this.servicioViajes.viajesFiltrado.length > 0){
      this.servicioViajes.viajesFiltrado.reverse();
    }
    
  }

}
