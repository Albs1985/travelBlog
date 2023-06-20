import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Viajes } from '../interfaces/viajes.interface';
import { Viaje } from '../interfaces/viaje.interface';

@Injectable({
  providedIn: 'root'
})
export class ViajesService {

  cargando = true;

  viajesJSON = "assets/data/viajes.json";
  viaje : Viaje = {
    fechaInicio: new Date,
    fechaFin: new Date,
    destino: '',
    provincia: '',
    pais: '',
    dias: 0,
    estancia: '',
    tipoEstancia: '',
    transporte: [],
    personas: []  
  }

  viajesLista : Viajes[] = [];
  viajesPorAnyoLista : Viaje[] = [];

  viajes : Viajes = {
    anyo: 0,
    destinos: []
  }

  constructor(private http: HttpClient) {

    // this.cargarViajesPorAnyo();

  }


  cargarViajes(){

    //Añadimos el PROMISE para esperar a que se carguen los viajes
    return new Promise( (resolve, reject) => {
      
      this.http.get(this.viajesJSON)
        .subscribe( (response: any ) => {

          var array = [];
          for(let key in response){
            // console.log(key);
            // console.log(response[key]);
            this.viajes = {     
              anyo: 0,
              destinos: []
            };
            this.viajes.anyo = +key;
            var i = 0;
            for (let destins in response[key]){
              // console.log(destins);
              this.viajes.destinos[i] = destins;
              i++;
            }
            

            // console.log(this.viajes);
            array.push(this.viajes);
            // console.log(array);
            
          } 
          // console.log(array); // your required array


          this.viajesLista = array.reverse(); //Para ordenar de mayor a menor los años y que salga el ultimo año el primero

          console.log(this.viajesLista);

          this.cargando = false;

          resolve(this.viajesLista);
          
        });
      
    });
    
  }

  cargarViajesPorAnyo(anyo : any){

    //Añadimos el PROMISE para esperar a que se carguen los viajes
    return new Promise( (resolve, reject) => {
      
      this.http.get(this.viajesJSON)
        .subscribe( (response: any ) => {

          var array = [];
          for(let key in response){
            // console.log('anyo');
            // console.log(anyo.anyo);
            // console.log('key');
            // console.log(key);
            // console.log('response key');
            // console.log(response[key]);
            var viajesAnyo = response[key];
            if (anyo.anyo === key){
              for (let viatge in response[key]){
                // console.log('viatge');
                // console.log(viatge);
                // console.log(viajesAnyo[viatge]);
                this.viaje = {
                  fechaInicio: new Date,
                  fechaFin: new Date,
                  destino: '',
                  provincia: '',
                  pais: '',
                  dias: 0,
                  estancia: '',
                  tipoEstancia: '',
                  transporte: [],
                  personas: []  
                };
                
                this.viaje.fechaInicio =viajesAnyo[viatge].fechaInicio;
                this.viaje.fechaFin =viajesAnyo[viatge].fechaFin;
                this.viaje.destino =viajesAnyo[viatge].destino;
                this.viaje.provincia =viajesAnyo[viatge].provincia;
                this.viaje.pais =viajesAnyo[viatge].pais;
                this.viaje.dias =viajesAnyo[viatge].dias;
                this.viaje.estancia =viajesAnyo[viatge].estancia;
                this.viaje.tipoEstancia =viajesAnyo[viatge].tipoEstancia;
                var i = 0;

                for (let j=0; j < viajesAnyo[viatge].transporte.length; j++){
                  var transport = viajesAnyo[viatge].transporte[j];
                  console.log('transport');
                  console.log(transport);
                  var icono = "";
                  if (transport == "Autobus"){
                    icono = icono+"autobus.png";
                  }else if (transport == "Avion"){
                    icono = icono+"avion.png";
                  }else if (transport == "Barco"){
                    icono = icono+"barco-grande.png";
                  }else if (transport == "Bote"){
                    icono = icono+"bote.png";
                  }else if (transport == "Bicicleta"){
                    icono = icono+"bicicleta.png";
                  }else if (transport == "Coche"){
                    icono = icono+"coche.png";
                  }else if (transport == "Moto"){
                    icono = icono+"moto.png";
                  }else if (transport == "Tren"){
                    icono = icono+"tren.png";
                  }
                  console.log(icono);

                  this.viaje.transporte[j] = icono;
                  console.log(this.viaje.transporte[j]);
                  // i++;
                }
                i = 0;
                for (let persona in viajesAnyo[viatge].personas){
                  this.viaje.personas[i] = persona;
                  i++;
                }                
    
                console.log(this.viajes);
                array.push(this.viaje);
                console.log(array);
              }
            }
            
            
            
          } 
          // console.log(array); // your required array


          this.viajesPorAnyoLista = array.reverse(); //Para ordenar de mayor a menor los años y que salga el ultimo año el primero

          console.log(this.viajesPorAnyoLista);

          this.cargando = false;

          resolve(this.viajesPorAnyoLista);
          
        });
      
    });
    
  }


}
