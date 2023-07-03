import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Viajes } from '../interfaces/viajes.interface';
import { Viaje } from '../interfaces/viaje.interface';

@Injectable({
  providedIn: 'root'
})
export class ViajesService {

  cargandoViajes = true;
  anyoViaje = '';
  anyoActual : number = new Date().getFullYear();
  arrayFotos : string[] = [];

  viajesJSON = "assets/data/viajes.json";
  viaje : Viaje = {
    fechaInicio: new Date,
    fechaFin: new Date,
    destino: '',
    categoria: '',
    provincia: '',
    pais: '',
    year: 0,
    idAnteriorViaje: '',
    idSiguienteViaje: '',
    diaInicio : 0,
    mesInicio : 0,
    diaFin : 0,
    mesFin : 0,
    numFotos: 0,
    identificadorFotos: '',
    precio : 0,
    estancia: '',
    tipoEstancia: '',
    transporte: [],
    personas: [],
    mapaSrc: []
  }

  viajesLista : Viajes[] = [];
  viajesDetalleLista : Viaje[] = [];
  viajesFiltrado : Viaje[] = [];

  viajes : Viajes = {
    anyo: 0,
    destinos: []
  }

  constructor(private http: HttpClient) {

  }

  cargarFotosGaleria(){

    return new Promise( (resolve, reject) => {
      
      this.http.get(this.viajesJSON)
        .subscribe( (response: any ) => {

          for(let key in response){           
            var viajesAnyo = response[key];
            // console.log(viajesAnyo);
              for (let viatge in response[key]){
                // console.log(viatge);
                for (var i=1; i < viajesAnyo[viatge].numFotos; i++){
                  var foto = viajesAnyo[viatge].year +'/'+viajesAnyo[viatge].identificadorFotos+''+i+'.jpg';
                  console.log(foto);
                  this.arrayFotos.push(foto); 
                }                
              }
          } 
          
          console.log(this.arrayFotos);
          
          resolve(this.arrayFotos);
          
        });
      
    });
   
    
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
              this.viajes.destinos[i] = destins;
              i++;
            }
            array.push(this.viajes);
            
          } 
          
          this.viajesLista = array.reverse(); //Para ordenar de mayor a menor los años y que salga el ultimo año el primero

          resolve(this.viajesLista);
          this.cargandoViajes = false;
          
        });
      
    });
    
  }


  addViajeEnArray(viatge : any, viajesAnyo : any){
    this.viaje = {
      fechaInicio: new Date,
      fechaFin: new Date,      
      destino: '',
      categoria: '',
      provincia: '',
      pais: '',
      diaInicio : 0,
      diaFin : 0,
      year: 0,
      idAnteriorViaje: '',
      idSiguienteViaje: '',
      mesInicio : 0,
      mesFin : 0,
      numFotos: 0,
      identificadorFotos: '',
      precio : 0,
      estancia: '',
      tipoEstancia: '',
      transporte: [],
      personas: [] ,
      mapaSrc: [] 
    };
    
    this.viaje.fechaInicio =viajesAnyo[viatge].fechaInicio;
    this.viaje.fechaFin =viajesAnyo[viatge].fechaFin;
    this.viaje.destino =viajesAnyo[viatge].destino;
    this.viaje.provincia =viajesAnyo[viatge].provincia;
    this.viaje.pais =viajesAnyo[viatge].pais;
    this.viaje.numFotos =viajesAnyo[viatge].numFotos;
    this.viaje.identificadorFotos =viajesAnyo[viatge].identificadorFotos;
    this.viaje.precio =viajesAnyo[viatge].precio;
    this.viaje.diaInicio =viajesAnyo[viatge].fechaInicio.substring(8);
    this.viaje.mesInicio =viajesAnyo[viatge].fechaInicio.substring(5, 7);
    this.viaje.diaFin =viajesAnyo[viatge].fechaFin.substring(8);
    this.viaje.mesFin =viajesAnyo[viatge].fechaFin.substring(5, 7);
    this.viaje.year =viajesAnyo[viatge].year;
    this.viaje.idAnteriorViaje =viajesAnyo[viatge].idAnteriorViaje;
    this.viaje.idSiguienteViaje =viajesAnyo[viatge].idSiguienteViaje;
    this.viaje.categoria =viajesAnyo[viatge].categoria;
    this.viaje.estancia =viajesAnyo[viatge].estancia;
    this.viaje.tipoEstancia =viajesAnyo[viatge].tipoEstancia;
    

    for (let j=0; j < viajesAnyo[viatge].transporte.length; j++){
      var transport = viajesAnyo[viatge].transporte[j];
      var icono = "";
      if (transport == "Autobus"){
        icono = icono+"autobus.png";
      }else if (transport == "Avion"){
        icono = icono+"avion.png";
      }else if (transport == "Barco"){
        icono = icono+"barco-grande.png";
      }else if (transport == "Barca"){
        icono = icono+"barca.png";
      }else if (transport == "Bicicleta"){
        icono = icono+"bicicleta.png";
      }else if (transport == "Coche"){
        icono = icono+"coche.png";
      }else if (transport == "Moto"){
        icono = icono+"moto.png";
      }else if (transport == "Tren"){
        icono = icono+"tren.png";
      }else if (transport == "Furgoneta"){
        icono = icono+"camper.png";
      }else if (transport == "Caravana"){
        icono = icono+"caravana.png";
      }else if (transport == "FoodTruck"){
        icono = icono+"foodTruck.png";
      }

      this.viaje.transporte[j] = icono;
    }

    for (let i=0; i < viajesAnyo[viatge].personas.length; i++){
      var persona = viajesAnyo[viatge].personas[i];
      this.viaje.personas[i] = persona;
    }      
    
    for (let i=0; i < viajesAnyo[viatge].mapaSrc.length; i++){
      var mapaSrc = viajesAnyo[viatge].mapaSrc[i];
      this.viaje.mapaSrc[i] = mapaSrc;
    }

    return this.viaje;
  
}


  

  

  cargarViajesPorAnyo(anyo : any){

    //Añadimos el PROMISE para esperar a que se carguen los viajes
    return new Promise( (resolve, reject) => {
      
      this.http.get(this.viajesJSON)
        .subscribe( (response: any ) => {

          var array = [];
          for(let key in response){           
            var viajesAnyo = response[key];
            this.anyoViaje = anyo.filtro;
            if (anyo.filtro === key){
              for (let viatge in response[key]){

                this.viaje = this.addViajeEnArray(viatge, viajesAnyo);                
                array.push(this.viaje);
              }
            }
          } 
          this.viajesDetalleLista = array.reverse(); //Para ordenar de mayor a menor los años y que salga el ultimo año el primero

          resolve(this.viajesDetalleLista);
          this.cargandoViajes = false;          
        });
      
    });
    
  }


  cargarViajesParaFiltrar(){

    //Añadimos el PROMISE para esperar a que se carguen los viajes
    return new Promise( (resolve, reject) => {
      
      this.http.get(this.viajesJSON)
        .subscribe( (response: any ) => {

          var array = [];
          for(let key in response){
            var viajesAnyo = response[key];
            for (let viatge in response[key]){
              this.viaje = this.addViajeEnArray(viatge, viajesAnyo);              
              array.push(this.viaje);
            }   
          } 

          this.viajesFiltrado = array.reverse(); //Para ordenar de mayor a menor los años y que salga el ultimo año el primero

          resolve(this.viajesFiltrado);
          this.cargandoViajes = false;          
          
        });
      
    });
    
  }

  buscarViajes(termino : any){
    var palabra = '';

    if (termino.filtro != undefined){
      palabra = termino.filtro;
    }else{
      palabra = termino;
    }   

    return new Promise( (resolve, reject) => {
      if (this.viajesFiltrado.length === 0){
        //Cargar o esperar a que se carguen
        this.cargarViajesParaFiltrar().then(() => {
          //ejecutar después de tener los productos
          //Aplicar filtro
          resolve(this.filtrarViajes(palabra));
        });
      }else{
        //Aplicar filtro
        resolve(this.filtrarViajes(palabra));
      }

    });
    

  }

  private filtrarViajes(termino : string){
    
    this.viajesDetalleLista = [];
    
    const terminoLower = termino.toString().toLocaleLowerCase(); 
    this.viajesFiltrado.forEach(viaj => {
      
      let catergoriaLower = viaj.categoria.toLocaleLowerCase();
      if (catergoriaLower === 'montaña'){
        catergoriaLower = 'montanya';
      }
      const destinoLower = viaj.destino.toLocaleLowerCase();
      const provinciaLower = viaj.provincia.toLocaleLowerCase();
      
      let personas = '';
      for (var i=0; i < viaj.personas.length; i++){
        personas = personas + ' ' + viaj.personas[i];
      }
      const personasLower = personas.toLocaleLowerCase();

      let transporte = '';
      for (var i=0; i < viaj.transporte.length; i++){
        transporte = transporte + ' ' + viaj.transporte[i];
      }
      const transporteLower = transporte.toLocaleLowerCase();
      
      const estanciaLower = viaj.estancia.toLocaleLowerCase();
      const tipoEstanciaLower = viaj.tipoEstancia.toLocaleLowerCase();

      if (catergoriaLower.indexOf(terminoLower) >=0 || destinoLower.indexOf(terminoLower) >=0 || provinciaLower.indexOf(terminoLower) >=0 || personasLower.indexOf(terminoLower) >=0 || transporteLower.indexOf(terminoLower) >=0
          || estanciaLower.indexOf(terminoLower) >=0 || tipoEstanciaLower.indexOf(terminoLower) >=0){

        this.viajesDetalleLista.push(viaj);

      }
    });

    this.cargandoViajes = false;
    console.log(this.viajesDetalleLista);

  }

  cargarViaje(clave : any){

    //Añadimos el PROMISE para esperar a que se carguen los viajes
    return new Promise( (resolve, reject) => {
      
      this.http.get(this.viajesJSON)
        .subscribe( (response: any ) => {

          var array = [];
          var fechaInicioViaje = clave.ciudad.substring(0, clave.ciudad.indexOf('_'));
          console.log(fechaInicioViaje);
          this.anyoViaje = fechaInicioViaje.substring(0, fechaInicioViaje.indexOf('-'));
          console.log(this.anyoViaje);


          for(let key in response){            
            var viajesAnyo = response[key];
            if (this.anyoViaje === key){
              for (let viatge in response[key]){
                if (fechaInicioViaje == viajesAnyo[viatge].fechaInicio){
                  this.viaje = this.addViajeEnArray(viatge, viajesAnyo);
                  array.push(this.viaje);
                }
              }                
            }
          } 
          this.viajesDetalleLista = array.reverse(); //Para ordenar de mayor a menor los años y que salga el ultimo año el primero

          console.log(this.viajesDetalleLista);

          resolve(this.viajesDetalleLista);
          this.cargandoViajes = false;
          
        });
      
    });
    
  }



}
