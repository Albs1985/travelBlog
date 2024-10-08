import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AutenticationService } from 'src/app/services/autentication.service';
import { DibujosService } from 'src/app/services/dibujos.service';
import { FrasesService } from 'src/app/services/frases.service';
import { ViajerosService } from 'src/app/services/viajeros.service';

@Component({
  selector: 'app-dibujos',
  templateUrl: './dibujos.component.html',
  styleUrls: ['./dibujos.component.css']
})
export class DibujosComponent {

  p: number = 1; // Página inicial
  pageSize: number = 10; // Elementos por página
  maxSizeDisplay: number = 10;
  palabra : any = '';

  constructor(private route: ActivatedRoute, private translate: TranslateService, public servicioDibujos: DibujosService, public authenticationService: AutenticationService){
    this.maxSizeDisplay = 10;
    this.palabra = '';
    this.servicioDibujos.cargarDibujos();
  }


  buscarDibujos(){
    if($('#myInputDibujo').val() == ''){
      this.servicioDibujos.cargarDibujos();
    } else {
      this.palabra = $('#myInputDibujo').val();
    }
    this.servicioDibujos.buscarDibujos(this.palabra);
  }

}
