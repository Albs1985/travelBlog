import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FotosService } from 'src/app/services/fotos.service';
import { ViajerosService } from 'src/app/services/viajeros.service';
import { ViajesService } from 'src/app/services/viajes.service';

@Component({
  selector: 'app-galeria',
  templateUrl: './galeria.component.html',
  styleUrls: ['./galeria.component.css']
})
export class GaleriaComponent implements OnInit{

  

  constructor(private route: ActivatedRoute, public viajerosService : ViajerosService, public viajesService : ViajesService){
    
  }

  ngOnInit(): void {
    

    this.viajerosService.cargarViajeros();  
    this.viajesService.cargarFotosGaleria();
    
  }






}
