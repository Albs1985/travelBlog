import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RelatosService {

  cargandoRelatos$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  cargandoFotosRelatos$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  relato: string[] = [];

  // anyoViaje = '';
  // anyoActual : number = new Date().getFullYear();
  // arrayFotos : string[] = [];

  relatosJSON = "assets/data/relatos.json";
  // viaje : Viaje = {
  //   fechaInicio: new Date,
  //   fechaFin: new Date,
  //   destino: '',
  //   categoria: '',
  //   provincia: '',
  //   pais: '',
  //   year: 0,
  //   idAnteriorViaje: '',
  //   idSiguienteViaje: '',
  //   diaInicio : 0,
  //   mesInicio : 0,
  //   diaFin : 0,
  //   mesFin : 0,
  //   numFotos: 0,
  //   identificadorFotos: '',
  //   precio : 0,
  //   estancia: '',
  //   tipoEstancia: '',
  //   transporte: [],
  //   personas: [],
  //   mapaSrc: []
  // }

  // viajesLista : Viajes[] = [];
  // viajesDetalleLista : Viaje[] = [];
  // viajesFiltrado : Viaje[] = [];

  // viajes : Viajes = {
  //   anyo: 0,
  //   destinos: []
  // }

  constructor(private http: HttpClient) {

  }

  //TODO: : Observable<Viajes[]>
  // cargarRelatos(){

  //   //Añadimos el PROMISE para esperar a que se carguen los viajes
  //   return new Promise( (resolve, reject) => {

  //     this.http.get(this.viajesJSON)
  //       .subscribe( (response: any ) => {

  //         var array = [];
  //         for(let key in response){
  //           // console.log(key);
  //           // console.log(response[key]);
  //           this.viajes = {
  //             anyo: 0,
  //             destinos: []
  //           };
  //           this.viajes.anyo = +key;
  //           var i = 0;
  //           for (let destins in response[key]){
  //             this.viajes.destinos[i] = destins;
  //             i++;
  //           }
  //           array.push(this.viajes);

  //         }

  //         this.viajesLista = array.sort(); //Para ordenar de mayor a menor los años y que salga el ultimo año el primero

  //         resolve(this.viajesLista);
  //         this.cargandoViajes$.next(false);

  //       });

  //   });

  // }

  cargarRelato(clave : any){

    //Añadimos el PROMISE para esperar a que se carguen los viajes
    return new Promise( (resolve, reject) => {

      this.http.get(this.relatosJSON)
        .subscribe( (response: any ) => {

          var array = [];
          var fechaInicioViaje = clave.ciudad.substring(0, clave.ciudad.indexOf('_'));
          // console.log(fechaInicioViaje);
          // this.anyoViaje = fechaInicioViaje.substring(0, fechaInicioViaje.indexOf('-'));
          // console.log(this.anyoViaje);


          for(let key in response){
            var viajesAnyo = response[key];
            // if (this.anyoViaje === key){
            //   for (let viatge in response[key]){
            //     if (fechaInicioViaje == viajesAnyo[viatge].fechaInicio){
            //       this.viaje = this.addViajeEnArray(viatge, viajesAnyo);
            //       array.push(this.viaje);
            //     }
          //   //   }
          //   }
          }
          // this.viajesDetalleLista = array.sort(); //Para ordenar de mayor a menor los años y que salga el ultimo año el primero

          // console.log(this.viajesDetalleLista);

          // this.cargandoRelatos$.next(false);
          resolve(null);


        });

    });

  }



}
