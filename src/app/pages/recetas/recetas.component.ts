import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AutenticationService } from 'src/app/services/autentication.service';
import { FrasesService } from 'src/app/services/frases.service';
import { RecetasService } from 'src/app/services/recetas.service';

@Component({
  selector: 'app-recetas',
  templateUrl: './recetas.component.html',
  styleUrls: ['./recetas.component.css']
})
export class RecetasComponent {

  p: number = 1; // Página inicial
  pageSize: number = 1; // Elementos por página
  maxSizeDisplay: number = 1;
  palabra : any = '';

  constructor(private route: ActivatedRoute, private translate: TranslateService, public servicioRecetas: RecetasService, public authenticationService: AutenticationService){
    this.maxSizeDisplay = 1;
    this.palabra = '';
    this.servicioRecetas.cargarRecetas();
  }

  buscarRecetas(){
    if($('#myInputReceta').val() == ''){
      this.servicioRecetas.cargarRecetas();
    } else {
      this.palabra = $('#myInputReceta').val();
    }
    this.servicioRecetas.buscarRecetas(this.palabra);
    this.palabra = '';
  }

}
