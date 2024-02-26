import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { ViajeComponent } from './pages/viaje/viaje.component';
import { ViajesPorAnyoComponent } from './pages/viajes-por-anyo/viajes-por-anyo.component';
import { AboutComponent } from './pages/about/about.component';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { SafePipe } from './pipes/safe.pipe';
import { BookModeComponent } from './pages/book-mode/book-mode.component';
import { GaleriaComponent } from './pages/galeria/galeria.component';
import { PrincipalComponent } from './pages/principal/principal.component';
import { FavoritosComponent } from './pages/favoritos/favoritos.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { ContactQRComponent } from './pages/contact-qr/contact-qr.component';
import { FrasesComponent } from './pages/frases/frases.component';
import { RelatoAlbertComponent } from './pages/historias/relato-albert/relato-albert.component';
import { RelatoIaiaAnaComponent } from './pages/historias/relato-iaia-ana/relato-iaia-ana.component';
import { ViajesComponent } from './pages/viajes/viajes.component';
import { DibujosComponent } from './pages/dibujos/dibujos.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    ViajeComponent,
    ViajesPorAnyoComponent,
    AboutComponent,
    SafePipe,
    BookModeComponent,
    GaleriaComponent,
    PrincipalComponent,
    FavoritosComponent,
    ContactQRComponent,
    FrasesComponent,
    RelatoAlbertComponent,
    RelatoIaiaAnaComponent,
    ViajesComponent,
    DibujosComponent
  ],
  imports: [
    BrowserModule,
    NgxPaginationModule,
    AppRoutingModule,
    HttpClientModule,
    TranslateModule.forRoot(),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [ HttpClient ]
      }
    })
  ],
  providers: [HeaderComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
