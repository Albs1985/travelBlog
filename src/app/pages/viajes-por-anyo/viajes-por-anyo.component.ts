import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViajesService } from 'src/app/services/viajes.service';

@Component({
  selector: 'app-viajes-por-anyo',
  templateUrl: './viajes-por-anyo.component.html',
  styleUrls: ['./viajes-por-anyo.component.css']
})
export class ViajesPorAnyoComponent implements OnInit{

  constructor (private route: ActivatedRoute,
                public servicioViajes : ViajesService){
    
  }

  ngOnInit(){

    this.route.params.subscribe(params =>{
      
      
      // console.log('ALBERT');
      // console.log(params['filtro']);
      
      var isNum = Number.isInteger(Number(params['filtro']));
      
      if (isNum){
        console.log('Filtramos por anyo');
        this.servicioViajes.cargarViajesPorAnyo(params);
      }else{
        console.log('Filtramos por palabra');
        this.servicioViajes.buscarViajes(params);
      }
      
      
    }); 

  }

}
