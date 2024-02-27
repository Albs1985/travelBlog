import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Frase } from '../interfaces/frase.interface';

@Injectable({
  providedIn: 'root'
})
export class FrasesService {

  cargandoFrases$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  frasesFiltrado: Frase[] = [];
  frases: Frase[] = [];
  frase : Frase = {
    anyo: '',
    persona: '',
    id: ''
  };

  frasesJSON = "assets/data/frases.json";
  constructor(private http: HttpClient) {

  }

  cargarFrases(){

    this.cargandoFrases$.next(true);
    return new Promise( (resolve, reject) => {

      this.http.get(this.frasesJSON)
        .subscribe( (response: any ) => {

          // console.log(response);
          var array = [];
          for(let key in response){
            // console.log(key);
            // console.log(response[key]);
            this.frase = {
              anyo: '',
              persona: '',
              id: ''
            };
            this.frase.anyo = response[key].anyo;
            this.frase.persona = response[key].persona;
            this.frase.id = response[key].id;

            array.push(this.frase);

          }

          this.frases = array;

          this.cargandoFrases$.next(false);

          resolve(this.frases);

        });

    });

  }

  buscarFrases(termino : any){
    var palabra = '';
    this.cargandoFrases$.next(true);
    if (termino.filtro != undefined){
      palabra = termino.filtro;
    }else{
      palabra = termino;
    }

    return new Promise( (resolve, reject) => {
      if (this.frases.length === 0){
        this.cargarFrases().then(() => {
          resolve(this.filtrarFrases(palabra));
        });
      }else{
        resolve(this.filtrarFrases(palabra));
      }

    });


  }

  private filtrarFrases(termino : string){

    this.frasesFiltrado = [];

    const terminoLower = termino.toString().toLocaleLowerCase();
    this.frases.forEach(fras => {

      let anyoLower = fras.anyo.toLocaleLowerCase();
      let personaLower = fras.persona.toLocaleLowerCase();

      if (anyoLower.indexOf(terminoLower) >=0 || personaLower.indexOf(terminoLower) >=0){
        this.frasesFiltrado.push(fras);
      }
    });

    this.frases = this.frasesFiltrado;

    this.cargandoFrases$.next(false);
    // console.log(this.frases);

  }



}
