import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Receta } from 'src/app/interfaces/receta.interface';
import { AutenticationService } from 'src/app/services/autentication.service';
import { FrasesService } from 'src/app/services/frases.service';
import { RecetasService } from 'src/app/services/recetas.service';

@Component({
  selector: 'app-recetas',
  templateUrl: './recetas.component.html',
  styleUrls: ['./recetas.component.css']
})
export class RecetasComponent {

  // p: number = 1; // Página inicial
  // pageSize: number = 1; // Elementos por página
  // maxSizeDisplay: number = 5;
  palabra : any = '';
  categoria : any = '';
  recetaMostrada : Receta = {
    id: 0,
    nombre: '',
    categoria: '',
    cocinero: '',
    dificultad: '',
    ingredientes: [],
    utensilios: [],
    tiempoPreparacion: 0,
    tiempoHorno: 0,
    temperatura: 0,
    numPasos: [],
    imagen: '',
    raciones: 0
  };

  constructor(private route: ActivatedRoute, private translate: TranslateService, public servicioRecetas: RecetasService, public authenticationService: AutenticationService){
    this.palabra = '';
    this.servicioRecetas.cargarRecetas();
  }

  buscarRecetas(tipo: any){
    // this.p = 1;
    this.categoria = tipo;
    if (tipo === ''){
      if($('#myInputReceta').val() == ''){
        this.servicioRecetas.cargarRecetas();
      } else {
        this.palabra = $('#myInputReceta').val();
      }
    }else{
      this.palabra = tipo;
    }

    this.servicioRecetas.buscarRecetas(this.palabra).then(()=>{

      if (this.servicioRecetas.recetas.length === 1){
        this.recetaMostrada = this.servicioRecetas.recetas[0];
      }else{
        this.recetaMostrada = {
          id: 0,
          nombre: '',
          categoria: '',
          cocinero: '',
          dificultad: '',
          ingredientes: [],
          utensilios: [],
          tiempoPreparacion: 0,
          tiempoHorno: 0,
          temperatura: 0,
          numPasos: [],
          imagen: '',
          raciones: 0
        };
      }

      // console.log(this.recetaMostrada);
    });

    this.palabra = '';
  }

}
