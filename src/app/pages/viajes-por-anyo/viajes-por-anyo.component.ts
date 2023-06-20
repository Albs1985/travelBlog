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

    this.route.params.subscribe(parametros =>{
      
      // console.log(parametros);
      
      this.servicioViajes.cargarViajesPorAnyo(parametros);
      
    }); 

  }


  // refresh(): void {
  //   window.location.reload();
  //   this.isRefreshed = true;
  // }

}
