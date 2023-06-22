import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Viajero } from '../interfaces/viajero.interface';

@Injectable({
  providedIn: 'root'
})
export class ViajerosService {

  viajerosJSON = "assets/data/viajeros.json";
  viajerosLista : Viajero[] = [];

  cargando = true;

  viajero : Viajero = {
    nacimiento : new Date(),
    nombreCompleto : '',
    nombreCorto : '',
    fotoPerfil : ''
  }

  constructor(private http: HttpClient) {
    
  }


  cargarViajeros(){

    //Añadimos el PROMISE para esperar a que se carguen los viajeros
    return new Promise( (resolve, reject) => {
      
      this.http.get(this.viajerosJSON)
        .subscribe( (response: any ) => {
          console.log(response);
          var array = [];
          for(let key in response){
            console.log(key);
            console.log(response[key]);
            this.viajero = {
              nacimiento : new Date(),
              nombreCompleto : '',
              nombreCorto : '',
              fotoPerfil : ''
            };
            this.viajero.nacimiento = response[key].nacimiento;
            this.viajero.nombreCompleto = response[key].nombreCompleto;
            this.viajero.nombreCorto = response[key].nombreCorto;
            this.viajero.fotoPerfil = response[key].fotoPerfil;

            array.push(this.viajero);           
            
          } 

          this.viajerosLista = array; 

          this.cargando = false;

          resolve(this.viajerosLista);
          
        });
      
    });
    
  }
}
