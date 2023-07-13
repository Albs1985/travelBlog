import { Injectable } from '@angular/core';
import { Foto } from '../interfaces/foto.interface';
import { HttpClient } from '@angular/common/http';
import { FotoFav } from '../interfaces/fotoFav.interface';

@Injectable({
  providedIn: 'root'
})
export class FotosService {

  fotosJSON = "assets/data/fotos.json";
  fotosFavJSON = "assets/data/fotosFav.json";
  fotosLista : Foto[] = [];
  fotosFavLista : FotoFav[] = [];
  fotosFavListaFiltrado : FotoFav[] = [];

  cargandoFotos = true;
  cargandoFotosFav = true;

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

  fotoFav : FotoFav = {
    idDesc: '',
    id: '',
    anyo: '',
    lugar : '',
    categoria : '',
    personas: ''
  }

  constructor(private http: HttpClient) {
    
  }

  cargarFotos(clave : any){

    //Añadimos el PROMISE para esperar a que se carguen las URL de las fotos
    return new Promise( (resolve, reject) => {
      
      this.http.get(this.fotosJSON)
        .subscribe( (response: any ) => {

          var fechaInicioViaje = clave.ciudad.substring(0, clave.ciudad.indexOf('_'));
          // console.log('fechaInicioViaje FOTOS '+fechaInicioViaje);
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

              // console.log(this.foto);
  
              array.push(this.foto);
            }            
            
          } 
          // console.log(array);
          this.fotosLista = array; 

          

          resolve(this.fotosLista);
          this.cargandoFotos = false;
          
        });
      
    });
    
  }


  cargarFotosFav(){
    this.cargandoFotosFav = true;
    //Añadimos el PROMISE para esperar a que se carguen las URL de las fotos
    return new Promise( (resolve, reject) => {
      
      this.http.get(this.fotosFavJSON).subscribe( (response: any ) => {
          var array = [];
                    
            for(let key in response){
              // console.log('key '+key);              
              this.fotoFav = {  
                idDesc: '',   
                id: '',
                anyo: '',
                lugar : '',
                categoria : '',
                personas: ''
              };
              
              this.fotoFav.idDesc = response[key].idDesc;
              this.fotoFav.id = response[key].id;
              this.fotoFav.anyo = response[key].anyo;
              this.fotoFav.lugar = response[key].lugar;
              this.fotoFav.categoria = response[key].categoria;
              this.fotoFav.personas = response[key].personas;
              // console.log(this.fotoFav);    
              array.push(this.fotoFav);
            }
          // console.log(array);
          this.fotosFavLista = array;
          this.fotosFavListaFiltrado = array;

          this.cargandoFotosFav = false;
          resolve(this.fotosFavLista);

        });
      
    });
    
  }

  filtrarFotosFav(termino : any){
    this.cargandoFotos = true;
    
    // console.log(termino);
    return new Promise( (resolve, reject) => {
      if (this.fotosFavListaFiltrado.length === 0){
        //Cargar o esperar a que se carguen
        this.cargarFotosFav().then(() => {
          //ejecutar después de tener los productos
          //Aplicar filtro
          resolve(this.filtrarFotos(termino));
        });
      }else{
        //Aplicar filtro
        resolve(this.filtrarFotos(termino));
      }

    });

  }


  private filtrarFotos(termino : string){
    
    this.fotosFavLista = [];
    // console.log(termino);
    const terminoLower = termino.toString().toLocaleLowerCase(); 
    this.fotosFavListaFiltrado.forEach(foto => {
      
      // console.log(foto);

      let catergoriaLower = foto.categoria.toLocaleLowerCase();
      if (catergoriaLower === 'montaña'){
        catergoriaLower = 'montanya';
      }
      const idLower = foto.id.toLocaleLowerCase();
      const anyo = foto.anyo;
      const lugarLower = foto.lugar.toLocaleLowerCase();
      // const categoriaLower = foto.categoria.toLocaleLowerCase();
      const personasLower = foto.personas.toLocaleLowerCase();

      // console.log(idLower);
      // console.log(anyo);
      // console.log(lugarLower);
      // console.log(personasLower);

      if (catergoriaLower.indexOf(terminoLower) >=0 || idLower.indexOf(terminoLower) >=0 || anyo.indexOf(terminoLower) >=0 || lugarLower.indexOf(terminoLower) >=0 || personasLower.indexOf(terminoLower) >=0){

        this.fotosFavLista.push(foto);

      }
    });

    this.cargandoFotos = false;
    // console.log(this.fotosFavLista);

  }

}
