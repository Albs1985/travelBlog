import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export type GrupoNav = 'inicio' | 'viajes' | 'recuerdos' | 'familia' | 'juegos' | '';

export interface SubEnlace {
  ruta: string;
  etiqueta: string; // clave de traducción
}

// Primer segmento de la URL -> pestaña a la que pertenece
const SEGMENTO_A_GRUPO: Record<string, GrupoNav> = {
  principal: 'inicio',
  viajes: 'viajes',
  viajesFiltrados: 'viajes',
  viaje: 'viajes',
  mapa: 'viajes',
  fotos: 'recuerdos',
  galeria: 'recuerdos',
  favoritos: 'recuerdos',
  dibujos: 'recuerdos',
  historias: 'recuerdos',
  familia: 'familia',
  apodos: 'familia',
  frases: 'familia',
  cumpleanyos: 'familia',
  recetas: 'familia',
  games: 'juegos',
  contactQR: '',
  ia: ''
};

// Chips de segundo nivel bajo la cabecera (solo donde hay varias páginas distintas)
const SUBNAV: Partial<Record<GrupoNav, SubEnlace[]>> = {
  recuerdos: [
    { ruta: '/fotos', etiqueta: 'nav.fotos' },
    { ruta: '/historias/relatoAlbert', etiqueta: 'app.historiaAlbaAlbert' },
    { ruta: '/historias/relatoIaiaAna', etiqueta: 'header.iaiaAna' },
    { ruta: '/historias/relatoBodaEsteve', etiqueta: 'header.bodaEsteve' }
  ]
};

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent implements OnDestroy {
  grupo: GrupoNav = 'inicio';
  subitems: SubEnlace[] = [];
  mostrarSubnav = false;

  private suscripcion: Subscription;

  constructor(private router: Router) {
    this.actualizar(this.router.url);
    this.suscripcion = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.actualizar(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.suscripcion.unsubscribe();
  }

  private actualizar(url: string): void {
    const partes = url.split(/[?#]/)[0].split('/').filter(Boolean);
    const segmento = partes[0] ?? 'principal';
    this.grupo = SEGMENTO_A_GRUPO[segmento] ?? '';
    this.subitems = SUBNAV[this.grupo] ?? [];
    // En el detalle de un viaje (imagen a pantalla completa) no mostramos los chips
    this.mostrarSubnav = this.subitems.length > 0 && segmento !== 'viaje';
  }
}
