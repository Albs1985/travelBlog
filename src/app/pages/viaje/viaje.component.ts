import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViajesService } from '../../services/viajes.service';
import { FotosService } from 'src/app/services/fotos.service';

@Component({
  selector: 'app-viaje',
  templateUrl: './viaje.component.html',
  styleUrls: ['./viaje.component.css']
})
export class ViajeComponent implements OnInit{

  
  constructor (private route: ActivatedRoute, public servicioViajes : ViajesService, public servicioFotos : FotosService){

  }


  ngOnInit(){

    this.route.params.subscribe(params =>{
      
      console.log(params['ciudad']);      
      this.servicioFotos.cargarFotos(params);
      this.servicioViajes.cargarViaje(params);
      
    }); 

  }


}
