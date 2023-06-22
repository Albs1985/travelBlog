import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViajesService } from '../../services/viajes.service';

@Component({
  selector: 'app-viaje',
  templateUrl: './viaje.component.html',
  styleUrls: ['./viaje.component.css']
})
export class ViajeComponent implements OnInit{

  
  constructor (private route: ActivatedRoute, public servicioViajes : ViajesService){

  }


  ngOnInit(){

    this.route.params.subscribe(params =>{
      
      console.log(params['ciudad']);      
      this.servicioViajes.cargarViaje(params);

      console.log(this.servicioViajes.viajesDetalleLista[0].mapaSrc[0]);
      
      
    }); 

  }


}
