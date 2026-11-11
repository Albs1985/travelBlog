import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FotoFav } from '../interfaces/fotoFav.interface';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FotosService {

  fotosFavJSON = "assets/data/fotosFav.json";
  fotosFavLista : FotoFav[] = [];
  fotosFavListaFiltrado : FotoFav[] = [];
  numFotosAbout : number = 17;

  // cargandoFotos = true;
  // cargandoFotosFav = true;

  cargandoFotosFav$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

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

  cargarFotosFav(){
    this.cargandoFotosFav$.next(true);
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

          //Añadimos las fotos del about
          for (var i=1; i <= this.numFotosAbout; i++){
            this.fotoFav = {
              idDesc: '',
              id: '',
              anyo: '',
              lugar : '',
              categoria : '',
              personas: ''
            };

            this.fotoFav.idDesc = 'sinTexto';
            this.fotoFav.id = 'about/about'+i+'.jpg';
            this.fotoFav.anyo = 'Época de Antaño';
            this.fotoFav.lugar = 'Por la zona';
            this.fotoFav.categoria = 'Juventud, Antaño, Infancia, Jovens';
            this.fotoFav.personas = 'Alba, Albert';

            array.push(this.fotoFav);
          }


          // console.log(array);
          this.fotosFavLista = array;
          this.fotosFavListaFiltrado = array;

          this.cargandoFotosFav$.next(false);
          resolve(this.fotosFavLista);

        });

    });

  }

  filtrarFotosFav(termino : any){
    // this.cargandoFotosFav$.next(true);

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

    // console.log(this.fotosFavLista);

  }

}
