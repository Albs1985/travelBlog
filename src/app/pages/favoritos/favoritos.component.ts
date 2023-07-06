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

  constructor(private route: ActivatedRoute, public servicioFotos : FotosService){
    // this.numeroFotosFavoritos = 15;
    this.palabra = '';
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
