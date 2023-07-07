import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FotosService } from '../../services/fotos.service';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrls: ['./favoritos.component.css']
})
export class FavoritosComponent implements OnInit{

  // numeroFotosFavoritos : number = 15;
  palabra : any = '';
  orderDesc : boolean = false;
  
  //PARA LA PAGINACIÓN
  p: number = 1; // Página inicial
  pageSize: number = 10; // Elementos por página
  maxSizeDisplay: number = 5; //Defines the maximum number of page links to display. Default is 7. Minimum is 5.
  // paginacionResponsive = true;//SI QUEREMOS QUE SEA RESPONSIVE AÑADIR ESTO COMO ATRIBUTO DE LA PAGINACION [responsive]="paginacionResponsive"


  constructor(private route: ActivatedRoute, public servicioFotos : FotosService){
    // this.numeroFotosFavoritos = 15;
    this.palabra = '';
    this.maxSizeDisplay = 5;
    // this.paginacionResponsive = true;
  }
  ngOnInit(): void {
    this.servicioFotos.cargarFotosFav();
    
  }

  buscar(){
    
    if($('#myInputFav').val() == ''){
      this.servicioFotos.cargarFotosFav();
    } else {
      this.palabra = $('#myInputFav').val();
    }
    console.log("Busca favorito por "+this.palabra);
    this.servicioFotos.filtrarFotosFav(this.palabra);

  }

  public ordenar(): void {
    this.servicioFotos.fotosFavLista.reverse();
    this.orderDesc = !this.orderDesc;
  }  

}
