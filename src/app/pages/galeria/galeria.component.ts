import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViajesService } from 'src/app/services/viajes.service';

@Component({
  selector: 'app-galeria',
  templateUrl: './galeria.component.html',
  styleUrls: ['./galeria.component.css']
})
export class GaleriaComponent implements OnInit{

  p: number = 1; // Página inicial
  pageSize: number = 10; // Elementos por página
  maxSizeDisplay: number = 5;
  // paginacionResponsive = true;//SI QUEREMOS QUE SEA RESPONSIVE AÑADIR ESTO COMO ATRIBUTO DE LA PAGINACION [responsive]="paginacionResponsive"

  constructor(private route: ActivatedRoute, public viajesService : ViajesService){
    this.maxSizeDisplay = 5;
    // this.paginacionResponsive = true;
  }

  ngOnInit(): void {
    
    this.viajesService.cargarFotosGaleria();
    
  }






}
