import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

export type FiltroFotos = 'galeria' | 'favoritos' | 'dibujos';

/**
 * Página única de imágenes: galería, favoritos y dibujos.
 * Un filtro decide cuál se ve. Se puede abrir uno concreto con /fotos?filtro=dibujos
 * (valores: galeria, favoritos, dibujos).
 */
@Component({
  selector: 'app-fotos',
  templateUrl: './fotos.component.html',
  styleUrls: ['./fotos.component.css']
})
export class FotosComponent {
  filtro: FiltroFotos = 'favoritos';

  constructor(private route: ActivatedRoute) {
    this.route.queryParamMap.subscribe((params) => {
      const f = params.get('filtro');
      if (f === 'galeria' || f === 'favoritos' || f === 'dibujos') {
        this.filtro = f;
      }
    });
  }

  elegir(filtro: FiltroFotos): void {
    this.filtro = filtro;
  }
}
