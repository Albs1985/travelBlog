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
import { ViajesComponent } from './pages/viajes/viajes.component';
import { RelatoComponent } from './pages/relato/relato.component';
// import { RelatoIaiaAnaComponent } from './pages/historias/relato-iaia-ana/relato-iaia-ana.component';
// import { RelatoAlbertComponent } from './pages/historias/relato-albert/relato-albert.component';
// import { RelatoBodaEsteveComponent } from './pages/historias/relato-boda-esteve/relato-boda-esteve.component';
import { DibujosComponent } from './pages/dibujos/dibujos.component';
import { ApodosComponent } from './pages/apodos/apodos.component';
import { RecetasComponent } from './pages/recetas/recetas.component';
import { MemoryComponent } from './pages/games/memory/memory.component';
import { GamesComponent } from './pages/games/games.component';
import { QuienEsQuienComponent } from './pages/games/quien-es-quien/quien-es-quien.component';
import { AdivinaComponent } from './pages/games/adivina/adivina.component';
import { QuizComponent } from './pages/games/quiz/quiz.component';
import { MapComponent } from './pages/map/map.component';
import { TablerosComponent } from './pages/games/tableros/tableros.component';
import { MisionCumplidaComponent } from './pages/games/mision-cumplida/mision-cumplida.component';
import { FacedokuComponent } from './pages/games/facedoku/facedoku.component';
import { AhorcadoInfantilComponent } from './pages/games/ahorcado-infantil/ahorcado-infantil.component';
import { AventuraFamiliarComponent } from './pages/games/aventura-familiar/aventura-familiar.component';
import { PuzzleDeslizanteComponent } from './pages/games/puzzle-deslizante/puzzle-deslizante.component';
import { ImpostorComponent } from './pages/games/impostor/impostor.component';
import { SimonComponent } from './pages/games/simon/simon.component';
import { PuzzleComponent } from './pages/games/puzzle/puzzle.component';
import { Conecta4Component } from './pages/games/conecta4/conecta4.component';
import { TicketTrenComponent } from './pages/games/ticket-tren/ticket-tren.component';

const app_routes: Routes = [
  { path: 'principal', component : PrincipalComponent},
  { path: 'viajes', component : ViajesComponent},
  { path: 'galeria', component : GaleriaComponent},
  { path: 'favoritos', component : FavoritosComponent},
  { path: 'viajesFiltrados/:filtro', component : ViajesPorAnyoComponent},
  { path: 'viaje/:ciudad', component : ViajeComponent},
  { path: 'contactQR', component : ContactQRComponent},
  { path: 'bookMode', component : BookModeComponent},
  { path: 'historias/:slug', component : RelatoComponent},
  // { path: 'historias/relatoIaiaAna', component : RelatoIaiaAnaComponent},
  // { path: 'historias/relatoAlbert', component : RelatoAlbertComponent},
  // { path: 'historias/relatoBodaEsteve', component : RelatoBodaEsteveComponent},
  { path: 'games', component : GamesComponent},
  { path: 'games/memory', component : MemoryComponent},
  { path: 'games/quien-es-quien', component : QuienEsQuienComponent},
  { path: 'games/adivina', component : AdivinaComponent},
  { path: 'games/quiz', component : QuizComponent},
  { path: 'games/tableros', component : TablerosComponent},
  { path: 'games/misionCumplida', component : MisionCumplidaComponent},
  { path: 'games/facedoku', component : FacedokuComponent},
  { path: 'games/ahorcado', component : AhorcadoInfantilComponent},
  { path: 'games/aventura', component : AventuraFamiliarComponent},
  { path: 'games/puzzle-deslizante', component : PuzzleDeslizanteComponent},
  { path: 'games/impostor', component : ImpostorComponent},
  { path: 'games/simon', component : SimonComponent},
  { path: 'games/puzzle', component : PuzzleComponent},
  { path: 'games/conecta4', component : Conecta4Component},
  { path: 'games/ticket-tren', component : TicketTrenComponent},
  { path: 'frases', component : FrasesComponent},
  { path: 'recetas', component : RecetasComponent},
  { path: 'apodos', component : ApodosComponent},
  { path: 'dibujos', component : DibujosComponent},
  { path: 'mapa', component : MapComponent},
  { path: '**', pathMatch: 'full', redirectTo : 'principal'},
];

@NgModule({
  imports: [RouterModule.forRoot(app_routes, {useHash: true, scrollPositionRestoration: 'enabled'})], /* Para posicionar el cursor arriba del todo al abrir una pagina: "scrollPositionRestoration: 'enabled'" */
  exports: [RouterModule]
})
export class AppRoutingModule { }
