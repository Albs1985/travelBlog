import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Viajero } from '../interfaces/viajero.interface';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ViajerosService {

  viajerosJSON = "assets/data/viajeros.json";
  viajerosLista : Viajero[] = [];

  // cargando = true;
  cargando$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  anyo : number = new Date().getFullYear();


  viajero : Viajero = {
    nacimiento : new Date(),
    nombreCompleto : '',
    nombreCorto : '',
    fotoPerfil : '',
    edad : 0
  }

  constructor(private http: HttpClient) {

  }


  cargarViajeros(){

    this.cargando$.next(true);
    //Añadimos el PROMISE para esperar a que se carguen los viajeros
    return new Promise( (resolve, reject) => {

      this.http.get(this.viajerosJSON)
        .subscribe( (response: any ) => {


          // console.log(response);
          var array = [];
          for(let key in response){
            // console.log(key);
            // console.log(response[key]);
            this.viajero = {
              nacimiento : new Date(),
              nombreCompleto : '',
              nombreCorto : '',
              fotoPerfil : '',
              edad : 0
            };
            this.viajero.nacimiento = response[key].nacimiento;
            this.viajero.nombreCompleto = response[key].nombreCompleto;
            this.viajero.nombreCorto = response[key].nombreCorto;
            this.viajero.fotoPerfil = response[key].fotoPerfil;

            this.viajero.edad = this.anyo - Number.parseInt(response[key].nacimiento.substring(0, 4));

            array.push(this.viajero);

          }

          this.viajerosLista = array;

          this.cargando$.next(false);

          resolve(this.viajerosLista);

        });

    });

  }
}
