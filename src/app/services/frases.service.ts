import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Frase } from '../interfaces/frase.interface';

@Injectable({
  providedIn: 'root'
})
export class FrasesService {

  cargandoFrases$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
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

          console.log(response);
          var array = [];
          for(let key in response){
            console.log(key);
            console.log(response[key]);
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



}
