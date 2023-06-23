import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  constructor (private route: ActivatedRoute,
                public servicioViajes : ViajesService,
                public cabeceraComp : HeaderComponent){
                  
  }

  ngOnInit(){

    this.route.params.subscribe(params =>{
      
      
      // console.log('ALBERT');
      // console.log(params['filtro']);
      
      var isNum = Number.isInteger(Number(params['filtro']));
      this.palabra = params['filtro'];
      console.log(  );
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
      }


      
      
      
    }); 

  }

}
