import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ViajesPorAnyoComponent } from './pages/viajes-por-anyo/viajes-por-anyo.component';
import { ViajeComponent } from './pages/viaje/viaje.component';
import { AboutComponent } from './pages/about/about.component';
import { BookModeComponent } from './pages/book-mode/book-mode.component';
import { GaleriaComponent } from './pages/galeria/galeria.component';

const app_routes: Routes = [
  { path: 'home', component : HomeComponent},
  { path: 'about', component : AboutComponent},
  { path: 'galeria', component : GaleriaComponent},
  { path: 'viajesFiltrados/:filtro', component : ViajesPorAnyoComponent},
  { path: 'viaje/:ciudad', component : ViajeComponent},
  { path: 'bookMode', component : BookModeComponent},
  { path: '**', pathMatch: 'full', redirectTo : 'home'},
];

@NgModule({
  imports: [RouterModule.forRoot(app_routes, {useHash: true, scrollPositionRestoration: 'enabled'})], /* Para posicionar el cursor arriba del todo al abrir una pagina: "scrollPositionRestoration: 'enabled'" */
  exports: [RouterModule]
})
export class AppRoutingModule { }
