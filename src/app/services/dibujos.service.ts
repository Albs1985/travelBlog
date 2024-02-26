import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Dibujo } from '../interfaces/dibujo.interface';

@Injectable({
  providedIn: 'root'
})
export class DibujosService {

  cargandoDibujos$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  dibujosFiltrado: Dibujo[] = [];
  dibujos: Dibujo[] = [];
  dibujo : Dibujo = {
    anyo: '',
    persona: '',
    edad: '',
    id: ''
  };

  DibujosJSON = "assets/data/dibujos.json";
  constructor(private http: HttpClient) {

  }

  cargarDibujos(){

    this.cargandoDibujos$.next(true);
    return new Promise( (resolve, reject) => {

      this.http.get(this.DibujosJSON)
        .subscribe( (response: any ) => {

          console.log(response);
          var array = [];
          for(let key in response){
            console.log(key);
            console.log(response[key]);
            this.dibujo = {
              anyo: '',
              persona: '',
              edad: '',
              id: ''
            };
            this.dibujo.anyo = response[key].anyo;
            this.dibujo.persona = response[key].persona;
            this.dibujo.edad = response[key].edad;
            this.dibujo.id = response[key].id;

            array.push(this.dibujo);

          }

          this.dibujos = array;

          this.cargandoDibujos$.next(false);

          resolve(this.dibujos);

        });

    });

  }

  buscarDibujos(termino : any){
    var palabra = '';
    this.cargandoDibujos$.next(true);
    if (termino.filtro != undefined){
      palabra = termino.filtro;
    }else{
      palabra = termino;
    }

    return new Promise( (resolve, reject) => {
      if (this.dibujos.length === 0){
        this.cargarDibujos().then(() => {
          resolve(this.filtrarDibujos(palabra));
        });
      }else{
        resolve(this.filtrarDibujos(palabra));
      }

    });


  }

  private filtrarDibujos(termino : string){

    this.dibujosFiltrado = [];

    const terminoLower = termino.toString().toLocaleLowerCase();
    this.dibujos.forEach(dibu => {

      let anyoLower = dibu.anyo.toLocaleLowerCase();
      let personaLower = dibu.persona.toLocaleLowerCase();

      if (anyoLower.indexOf(terminoLower) >=0 || personaLower.indexOf(terminoLower) >=0){
        this.dibujosFiltrado.push(dibu);
      }
    });

    this.dibujos = this.dibujosFiltrado;

    this.cargandoDibujos$.next(false);
    console.log(this.dibujos);

  }
}
