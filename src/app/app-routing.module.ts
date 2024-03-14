import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViajesPorAnyoComponent } from './pages/viajes-por-anyo/viajes-por-anyo.component';
import { ViajeComponent } from './pages/viaje/viaje.component';
import { BookModeComponent } from './pages/book-mode/book-mode.component';
import { GaleriaComponent } from './pages/galeria/galeria.component';
import { PrincipalComponent } from './pages/principal/principal.component';
import { FavoritosComponent } from './pages/favoritos/favoritos.component';
import { ContactQRComponent } from './pages/contact-qr/contact-qr.component';
import { FrasesComponent } from './pages/frases/frases.component';
import { RelatoIaiaAnaComponent } from './pages/historias/relato-iaia-ana/relato-iaia-ana.component';
import { ViajesComponent } from './pages/viajes/viajes.component';
import { RelatoAlbertComponent } from './pages/historias/relato-albert/relato-albert.component';
import { DibujosComponent } from './pages/dibujos/dibujos.component';
import { ApodosComponent } from './pages/apodos/apodos.component';
import { RecetasComponent } from './pages/recetas/recetas.component';
import { MemoryComponent } from './pages/games/memory/memory.component';
import { GamesComponent } from './pages/games/games.component';
import { QuienEsQuienComponent } from './pages/games/quien-es-quien/quien-es-quien.component';

const app_routes: Routes = [
  { path: 'principal', component : PrincipalComponent},
  { path: 'viajes', component : ViajesComponent},
  { path: 'galeria', component : GaleriaComponent},
  { path: 'favoritos', component : FavoritosComponent},
  { path: 'viajesFiltrados/:filtro', component : ViajesPorAnyoComponent},
  { path: 'viaje/:ciudad', component : ViajeComponent},
  { path: 'contactQR', component : ContactQRComponent},
  { path: 'bookMode', component : BookModeComponent},
  { path: 'historias/relatoIaiaAna', component : RelatoIaiaAnaComponent},
  { path: 'historias/relatoAlbert', component : RelatoAlbertComponent},
  { path: 'games', component : GamesComponent},
  { path: 'games/memory', component : MemoryComponent},
  { path: 'games/quien-es-quien', component : QuienEsQuienComponent},
  { path: 'frases', component : FrasesComponent},
  { path: 'recetas', component : RecetasComponent},
  { path: 'apodos', component : ApodosComponent},
  { path: 'dibujos', component : DibujosComponent},
  { path: '**', pathMatch: 'full', redirectTo : 'principal'},
];

@NgModule({
  imports: [RouterModule.forRoot(app_routes, {useHash: true, scrollPositionRestoration: 'enabled'})], /* Para posicionar el cursor arriba del todo al abrir una pagina: "scrollPositionRestoration: 'enabled'" */
  exports: [RouterModule]
})
export class AppRoutingModule { }
