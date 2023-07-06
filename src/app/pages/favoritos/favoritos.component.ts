import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrls: ['./favoritos.component.css']
})
export class FavoritosComponent {

  numeroFotosFavoritos : number = 15;

  constructor(private route: ActivatedRoute){
    this.numeroFotosFavoritos = 15;
  }

}
