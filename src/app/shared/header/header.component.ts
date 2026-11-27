import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AutenticationService } from 'src/app/services/autentication.service';
import { CommonService } from 'src/app/services/common.service';
import { NotificationPushService } from 'src/app/services/notification-push.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  palabra : any;
  isSelectedSpanish : boolean = false;
  isSelectedValenciano : boolean = true;
  // mensajeCabeceraAnyo : boolean = true;
  // mensajeCabeceraFiltrar : boolean = false;
  // mensajeCabeceraAny : string = '';
  registrandoPush = false;

  constructor(/*private route: ActivatedRoute, */
              private translate: TranslateService,
              protected commonService : CommonService,
              public authenticationService: AutenticationService,
              protected notificationPushService: NotificationPushService,
              private router: Router){

                // this.mensajeCabeceraAnyo = true;
                // this.mensajeCabeceraFiltrar = false;
                // this.mensajeCabecera = 'Viatges per any';

  }

  public changeLanguageToSpanish(): void {
    this.translate.use('es');
    // this.translate.use('es');/*ESTO IGUAL NO HACE FALTA HACERLO DOS VECES*/
    this.isSelectedSpanish = true;
    this.isSelectedValenciano = false;
    // console.log('Idioma cambiado al Español');
    // this.mensajeCabecera = 'Viajes por año';
  }
  // Se cambia el idioma a Valenciano
  changeLanguageToValenciano(): void {
    this.translate.use('val');
    this.isSelectedSpanish = false;
    this.isSelectedValenciano = true;
    // console.log('Idioma cambiado al Valenciano');
    // this.mensajeCabecera = 'Viatges per any';
  }

  buscar(palabra: string): void {

    // Limpiamos espacios y comprobamos que haya texto
    const texto = palabra?.trim();

    if (!texto) {
      return;
    }

    // Navegamos a la página de resultados
    this.router.navigate(['/viajesFiltrados', texto]);

  }

  onTokenIaGuardado(token: string): void {
    this.commonService.claveGuardada = Boolean((token ?? '').trim());
  }

  async registrarDispositivo(nombreIngresado: string, inputEl?: HTMLInputElement): Promise<void> {
    const token = (localStorage.getItem('gh_travel_token') || '').trim();
    const nombre = (nombreIngresado || '').trim() || 'Móvil Albert';
debugger
    if (!token) {
      console.warn('No hay token de GitHub guardado en localStorage (gh_travel_token).');
      return;
    }

    if (this.registrandoPush) return;
    this.registrandoPush = true;

    try {
      await this.notificationPushService.registrarDispositivo(token, nombre);
      if (inputEl) {
        inputEl.value = '';
      }
      console.log(`Dispositivo "${nombre}" registrado correctamente.`);
    } catch (error) {
      console.error('Error al registrar el dispositivo push:', error);
    } finally {
      this.registrandoPush = false;
    }
  }
}
