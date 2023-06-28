import { Injectable } from '@angular/core';
import { Foto } from '../interfaces/foto.interface';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class FotosService {

  fotosJSON = "assets/data/fotos.json";
  fotosLista : Foto[] = [];

  cargandoFotos = true;

  foto : Foto = {
    principal : '',
    foto1 : '',
    foto2 : '',
    foto3 : '',
    foto4 : '',
    foto5 : '',
    foto6 : '',
    foto7 : '',
    foto8 : '',
    foto9 : '',
    foto10 : '',
    foto11 : '',
    foto12 : ''
  }

  constructor(private http: HttpClient) {
    
  }

  cargarFotos(clave : any){

    //Añadimos el PROMISE para esperar a que se carguen las URL de las fotos
    return new Promise( (resolve, reject) => {
      
      this.http.get(this.fotosJSON)
        .subscribe( (response: any ) => {

          var fechaInicioViaje = clave.ciudad.substring(clave.ciudad.indexOf('_')+1);
          // console.log('fechaInicioViaje '+fechaInicioViaje);
          // var anyoViaje = clave.ciudad.substring(clave.ciudad.indexOf('_')+1, clave.ciudad.indexOf('-'));

          var array = [];
          for(let key in response){
            // console.log('key '+key);
            if (fechaInicioViaje == key){
              this.foto = {     
                principal : '',
                foto1 : '',
                foto2 : '',
                foto3 : '',
                foto4 : '',
                foto5 : '',
                foto6 : '',
                foto7 : '',
                foto8 : '',
                foto9 : '',
                foto10 : '',
                foto11 : '',
                foto12 : ''
              };
              
              this.foto.principal = response[key].principal;
              this.foto.foto1 = response[key].foto1;
              this.foto.foto2 = response[key].foto2;
              this.foto.foto3 = response[key].foto3;
              this.foto.foto4 = response[key].foto4;
              this.foto.foto5 = response[key].foto5;
              this.foto.foto6 = response[key].foto6;
              this.foto.foto7 = response[key].foto7;
              this.foto.foto8 = response[key].foto8;    
              this.foto.foto9 = response[key].foto9;
              this.foto.foto10 = response[key].foto10;
              this.foto.foto11 = response[key].foto11;
              this.foto.foto12 = response[key].foto12;

              console.log(this.foto);
  
              array.push(this.foto);
            }            
            
          } 
          console.log(array);
          this.fotosLista = array; 

          

          resolve(this.fotosLista);
          this.cargandoFotos = false;
          
        });
      
    });
    
  }

}
