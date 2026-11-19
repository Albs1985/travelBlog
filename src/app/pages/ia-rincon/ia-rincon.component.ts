import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IdiomaIa, IaFamiliaService } from '../../services/ia-familia.service';
import { finalize, of, switchMap } from 'rxjs';

export interface MensajeChatFamilia {
  remitente: 'usuario' | 'ia';
  texto: string;
  hora: string;
}

@Component({
  selector: 'app-ia-rincon',
  templateUrl: './ia-rincon.component.html',
  styleUrls: ['./ia-rincon.component.css']
})
export class IaRinconComponent implements OnInit {
  modo: 'familia' | 'cuento' = 'familia';

  // Gestión de clave/token de IA (similar al token de GitHub, guardado en localStorage)
  apiKeyInput = '';
  claveGuardada = false;
  mostrarPanelToken = false;

  // Buscador / entrada principal estilo Google
  consulta = '';

  // Modo Familia: conversación tipo chat
  mensajesChat: MensajeChatFamilia[] = [];

  // Modo Cuentos: formato libro infantil
  tituloCuento = '';
  parrafosCuento: string[] = [];
  mostrarHuecoImagen = true;
  imagenCuentoUrl: string | null = null;
  cargandoImagenCuento = false;

  cargando = false;
  errorMsg = '';

  readonly sugerenciasFamilia = [
    'iaRincon.sugerenciaFamilia1',
    'iaRincon.sugerenciaFamilia2',
    'iaRincon.sugerenciaFamilia3'
  ];

  readonly sugerenciasCuento = [
    'iaRincon.sugerenciaCuento1',
    'iaRincon.sugerenciaCuento2',
    'iaRincon.sugerenciaCuento3'
  ];


  constructor(
    private iaService: IaFamiliaService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.apiKeyInput = this.iaService.obtenerApiKey();
    this.claveGuardada = this.iaService.tieneApiKey();
  }

  togglePanelToken(): void {
    this.apiKeyInput = this.iaService.obtenerApiKey();
    this.mostrarPanelToken = !this.mostrarPanelToken;
    this.errorMsg = '';
  }

  guardarTokenIa(): void {
    this.iaService.guardarApiKey(this.apiKeyInput);
    this.claveGuardada = this.iaService.tieneApiKey();
    this.mostrarPanelToken = false;
    this.errorMsg = '';
  }

  borrarTokenIa(): void {
    this.iaService.guardarApiKey('');
    this.apiKeyInput = '';
    this.claveGuardada = false;
    this.errorMsg = '';
  }

  seleccionarModo(nuevoModo: 'familia' | 'cuento'): void {
    this.modo = nuevoModo;
    this.errorMsg = '';
    this.consulta = '';
  }

  usarSugerencia(claveTraduccion: string): void {
    this.consulta = this.translate.instant(claveTraduccion);
    this.ejecutarConsulta();
  }

  limpiarConversacion(): void {
    this.mensajesChat = [];
    this.errorMsg = '';
  }

  limpiarCuento(): void {
    this.tituloCuento = '';
    this.parrafosCuento = [];
    this.imagenCuentoUrl = null;
    this.cargandoImagenCuento = false;
    this.errorMsg = '';
  }

  ejecutarConsulta(): void {
    const texto = (this.consulta ?? '').trim();
    if (!texto || this.cargando) {
      return;
    }

    if (!this.iaService.tieneApiKey()) {
      this.mostrarPanelToken = true;
      this.errorMsg = 'Primero introduce tu token / clave de IA en la barra superior.';
      return;
    }

    this.errorMsg = '';
    this.cargando = true;

    if (this.modo === 'familia') {
      this.mensajesChat.push({
        remitente: 'usuario',
        texto,
        hora: this.obtenerHoraActual()
      });
      this.consulta = '';

      this.iaService
        .preguntarFamilia(texto, this.obtenerIdiomaActivo())
        .pipe(finalize(() => (this.cargando = false)))
        .subscribe({
          next: (respuesta) => {
            this.mensajesChat.push({
              remitente: 'ia',
              texto: respuesta,
              hora: this.obtenerHoraActual()
            });
          },
          error: (err) => {
            this.errorMsg = this.obtenerMensajeErrorAmigable(err);
          }
        });
    } else {
      this.imagenCuentoUrl = null;
      this.cargandoImagenCuento = true;

      this.iaService
        .inventarCuento(
          {
            protagonistas: texto,
            lugar: texto,
            tono: 'tierno, mágico y divertido'
          },
          this.obtenerIdiomaActivo()
        )
        .pipe(finalize(() => (this.cargando = false)))
        .subscribe({
          next: (cuentoRaw) => {
            this.formatearCuento(cuentoRaw, texto);

            this.iaService
              .generarIlustracionParaCuento(texto)
              .pipe(
                switchMap((imgIa) => {
                  if (imgIa) {
                    return of(imgIa);
                  }
                  return this.iaService.crearCollageDesdePrompt(texto);
                }),
                finalize(() => (this.cargandoImagenCuento = false))
              )
              .subscribe({
                next: (imgDataUrl) => {
                  this.imagenCuentoUrl = imgDataUrl;
                },
                error: () => {
                  this.imagenCuentoUrl = null;
                }
              });
          },
          error: (err) => {
            this.cargandoImagenCuento = false;
            this.errorMsg = this.obtenerMensajeErrorAmigable(err);
          }
        });
    }
  }

  private formatearCuento(raw: string, promptOriginal: string): void {
    const bloques = raw
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);

    if (bloques.length > 1 && bloques[0].length < 95 && !bloques[0].endsWith('.')) {
      this.tituloCuento = bloques[0].replace(/^#+\s*|\*\*/g, '').trim();
      this.parrafosCuento = bloques.slice(1).map((p) => p.replace(/\*\*/g, '').trim());
    } else {
      this.tituloCuento = `Un cuento sobre: ${promptOriginal}`;
      this.parrafosCuento = bloques.length > 0
        ? bloques.map((p) => p.replace(/\*\*/g, '').trim())
        : [raw.replace(/\*\*/g, '').trim()];
    }
  }

  private obtenerHoraActual(): string {
    const ahora = new Date();
    return ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private obtenerIdiomaActivo(): IdiomaIa {
    const actual = (this.translate.currentLang || this.translate.defaultLang || 'es').toLowerCase();
    return actual.startsWith('val') ? 'val' : 'es';
  }

  onTokenIaGuardado(token: string): void {
    this.claveGuardada = Boolean((token ?? '').trim());
    if (this.claveGuardada) {
      this.errorMsg = '';
    }
  }

  private obtenerMensajeErrorAmigable(err: any): string {
    const rawMensaje =
      err?.error?.message ||
      err?.message ||
      (typeof err === 'string' ? err : '');

    const textoMinusculas = String(rawMensaje).toLowerCase();
    const codigo = err?.status ?? err?.error?.code;
    const estado = err?.statusText || err?.error?.status;

    const esSobrecarga503 =
      codigo === 503 ||
      estado === 'UNAVAILABLE' ||
      textoMinusculas.includes('503') ||
      textoMinusculas.includes('unavailable') ||
      textoMinusculas.includes('high demand');

    if (esSobrecarga503) {
      return this.translate.instant('iaRincon.errorAltaDemanda');
    }

    if (codigo === 429 || textoMinusculas.includes('429') || textoMinusculas.includes('quota')) {
      return this.translate.instant('iaRincon.errorCuota');
    }

    if (textoMinusculas.includes('clave') || textoMinusculas.includes('api key')) {
      return this.translate.instant('iaRincon.errorFaltaToken');
    }

    return this.translate.instant('iaRincon.errorGenerico');
  }
}
