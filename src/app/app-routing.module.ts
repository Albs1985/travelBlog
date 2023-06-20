import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ViajesPorAnyoComponent } from './pages/viajes-por-anyo/viajes-por-anyo.component';
import { ViajeComponent } from './pages/viaje/viaje.component';
import { AboutComponent } from './pages/about/about.component';

const app_routes: Routes = [
  { path: 'home', component : HomeComponent},
  { path: 'about', component : AboutComponent},
  { path: 'viajesPorAnyo/:anyo', component : ViajesPorAnyoComponent},
  { path: 'viaje/:ciudad', component : ViajeComponent},
  { path: '**', pathMatch: 'full', redirectTo : 'home'},
];

@NgModule({
  imports: [RouterModule.forRoot(app_routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
