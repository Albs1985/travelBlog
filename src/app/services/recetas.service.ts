import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Receta } from '../interfaces/receta.interface';

@Injectable({
  providedIn: 'root'
})
export class RecetasService {

  cargandoRecetas$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  recetasFiltrado: Receta[] = [];
  recetas: Receta[] = [];
  receta : Receta = {
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
    porciones: 0
  };

  recetasJSON = "assets/data/recetas.json";
  constructor(private http: HttpClient) {

  }

  cargarRecetas(){

    this.cargandoRecetas$.next(true);
    return new Promise( (resolve, reject) => {

      this.http.get(this.recetasJSON)
        .subscribe( (response: any ) => {

          // console.log(response);
          var array = [];
          for(let key in response){
            // console.log(key);
            // console.log(response[key]);
            this.receta = {
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
              porciones: 0
            };
            this.receta.id = response[key].id;
            this.receta.nombre = response[key].nombre;
            this.receta.categoria = response[key].categoria;
            this.receta.cocinero = response[key].cocinero;
            this.receta.dificultad = response[key].dificultad;
            this.receta.ingredientes = response[key].ingredientes;
            this.receta.utensilios = response[key].utensilios;
            this.receta.tiempoPreparacion = response[key].tiempoPreparacion;
            this.receta.tiempoHorno = response[key].tiempoHorno;
            this.receta.temperatura = response[key].temperatura;
            this.receta.numPasos = response[key].numPasos;
            this.receta.porciones = response[key].porciones;
            this.receta.imagen = response[key].imagen;

            array.push(this.receta);
          }

          this.recetas = array;

          // this.cargandoRecetas$.next(false);

          resolve(this.recetas);

        });

    });

  }

  buscarRecetas(termino : any){
    var palabra = '';
    this.cargandoRecetas$.next(true);
    if (termino.filtro != undefined){
      palabra = termino.filtro;
    }else{
      palabra = termino;
    }

    return new Promise( (resolve, reject) => {
      if (this.recetas.length === 0){
        this.cargarRecetas().then(() => {
          resolve(this.filtrarRecetas(palabra));
        });
      }else{
        resolve(this.filtrarRecetas(palabra));
      }

    });


  }

  private filtrarRecetas(termino : string){

    this.recetasFiltrado = [];

    const terminoLower = termino.toString().toLocaleLowerCase();
    this.recetas.forEach(rec => {
      let nombreLower = rec.nombre.toLocaleLowerCase();
      let categoriaLower = rec.categoria.toLocaleLowerCase();
      let cocineroLower = rec.cocinero.toLocaleLowerCase();

      if (nombreLower.indexOf(terminoLower) >=0 || categoriaLower.indexOf(terminoLower) >=0 || cocineroLower.indexOf(terminoLower) >=0){
        this.recetasFiltrado.push(rec);
      }
    });

    this.recetas = this.recetasFiltrado;

    // this.cargandoRecetas$.next(false);

  }
}
