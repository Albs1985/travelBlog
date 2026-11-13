import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { ViajeComponent } from './pages/viaje/viaje.component';
import { ViajesPorAnyoComponent } from './pages/viajes-por-anyo/viajes-por-anyo.component';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { SafePipe } from './pipes/safe.pipe';
import { RelatoComponent } from './pages/relato/relato.component';
import { BuscadorComponent } from './shared/buscador/buscador.component';
import { BloquesComponent } from './shared/bloques/bloques.component';
import { LibroComponent } from './shared/libro/libro.component';
import { L10nPipe } from './pipes/l10n.pipe';
import { LightboxComponent } from './shared/lightbox/lightbox.component';
import { CarruselComponent } from './shared/carrusel/carrusel.component';
import { BookModeComponent } from './pages/book-mode/book-mode.component';
import { GaleriaComponent } from './pages/galeria/galeria.component';
import { PrincipalComponent } from './pages/principal/principal.component';
import { FavoritosComponent } from './pages/favoritos/favoritos.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { ContactQRComponent } from './pages/contact-qr/contact-qr.component';
import { FrasesComponent } from './pages/frases/frases.component';
import { ViajesComponent } from './pages/viajes/viajes.component';
import { DibujosComponent } from './pages/dibujos/dibujos.component';
import { ApodosComponent } from './pages/apodos/apodos.component';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './components/login/login.component';
import { RecetasComponent } from './pages/recetas/recetas.component';
import { MemoryComponent } from './pages/games/memory/memory.component';
import { GamesComponent } from './pages/games/games.component';
import { QuienEsQuienComponent } from './pages/games/quien-es-quien/quien-es-quien.component';
import { AdivinaComponent } from './pages/games/adivina/adivina.component';
import { QuizComponent } from './pages/games/quiz/quiz.component';
import { MapComponent } from './pages/map/map.component';
import { GraficaComponent } from './pages/map/grafica/grafica.component';
import { TablerosComponent } from './pages/games/tableros/tableros.component';
import { MisionCumplidaComponent } from './pages/games/mision-cumplida/mision-cumplida.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    ViajeComponent,
    ViajesPorAnyoComponent,
    SafePipe,
    L10nPipe,
    RelatoComponent,
    BuscadorComponent,
    BloquesComponent,
    LibroComponent,
    LightboxComponent,
    CarruselComponent,
    BookModeComponent,
    GaleriaComponent,
    PrincipalComponent,
    FavoritosComponent,
    ContactQRComponent,
    FrasesComponent,
    ViajesComponent,
    DibujosComponent,
    ApodosComponent,
    LoginComponent,
    RecetasComponent,
    MemoryComponent,
    GamesComponent,
    QuienEsQuienComponent,
    AdivinaComponent,
    QuizComponent,
    MapComponent,
    GraficaComponent,
    TablerosComponent,
    MisionCumplidaComponent,
  ],
  imports: [
    BrowserModule,
    NgxPaginationModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [ HttpClient ]
      }
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
