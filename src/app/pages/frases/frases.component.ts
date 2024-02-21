import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { FrasesService } from 'src/app/services/frases.service';
import { ViajerosService } from 'src/app/services/viajeros.service';

@Component({
  selector: 'app-frases',
  templateUrl: './frases.component.html',
  styleUrls: ['./frases.component.css']
})
export class FrasesComponent {

  p: number = 1; // Página inicial
  pageSize: number = 10; // Elementos por página
  maxSizeDisplay: number = 10;
  palabra : any = '';

  constructor(private route: ActivatedRoute, private translate: TranslateService, public servicioFrases: FrasesService, public viajerosService: ViajerosService){
    this.maxSizeDisplay = 10;
    this.palabra = '';
    this.servicioFrases.cargarFrases();
    this.viajerosService.cargarViajeros();
  }


  buscarFrases(){
    if($('#myInputFrase').val() == ''){
      this.servicioFrases.cargarFrases();
    } else {
      this.palabra = $('#myInputFrase').val();
    }
    console.log("Busca frase por "+this.palabra);
    this.servicioFrases.buscarFrases(this.palabra);
  }

}
