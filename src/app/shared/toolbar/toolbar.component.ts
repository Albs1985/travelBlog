import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AutenticationService } from 'src/app/services/autentication.service';
import { AppRoutingModule } from 'src/app/app-routing.module';

export type TipoTokenToolbar = 'github' | 'ia';
export type IdCampoIa = 'groq' | 'gemini' | 'huggingface' | 'pollinations' | 'cloudflare';

export interface CampoTokenIa {
  id: IdCampoIa;
  etiqueta: string;
  ayuda: string;
  placeholder: string;
  storageKey: string;
  valor: string;
  /** true = sirve para el chat/cuentos (se emite al padre); false = reservado (imágenes) */
  paraTexto: boolean;
}

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit {
  // Configuración de rutas y textos mediante Inputs
  @Input() volverLink: string = '/principal';
  @Input() textoNuevo: string = 'app.nuevoElemento';
  @Input() mostrarBotonNuevo: boolean = true;
  @Input() mostrarBotonConfig: boolean = false;
  @Input() textoBotonExtra: string = '';
  @Input() iconoBotonExtra: string = '';
  @Input() mostrarPanelToken: boolean = false;
  @Input() tipoToken: TipoTokenToolbar = 'github';

  // Opciones de ordenación (opcional)
  @Input() mostrarBotonOrdenar: boolean = false;
  @Input() orderDesc: boolean = false;

  // Opciones de borrado múltiple (opcional)
  @Input() mostrarBotonSeleccionMultiple: boolean = false;
  @Input() modoSeleccionMultiple: boolean = false;
  @Input() cantidadSeleccionada: number = 0;

  // Outputs para emitir las acciones al componente padre
  @Output() ordenar = new EventEmitter<void>();
  @Output() nuevo = new EventEmitter<void>();
  @Output() toggleSeleccionMultiple = new EventEmitter<void>();
  @Output() confirmarBorradoMultiple = new EventEmitter<void>();
  @Output() accionExtra = new EventEmitter<void>();
  @Output() tokenGuardado = new EventEmitter<string>();

  tokenActual: string = '';
  // mostrarPanelToken = false;
  mostrarClaves = false;

  /**
   * Campos del panel cuando tipoToken === 'ia'.
   * Las claves de storage coinciden con las que lee IaFamiliaService.
   * 'imagen' queda reservado: de momento ningún servicio lo usa.
   */
  camposIa: CampoTokenIa[] = [
    {
      id: 'groq',
      etiqueta: 'Groq (principal)',
      ayuda: 'Rápido y con cuota gratuita. Se crea en console.groq.com. Empieza por gsk_',
      placeholder: 'gsk_...',
      storageKey: 'groq_familia_api_key',
      valor: '',
      paraTexto: true
    },
    {
      id: 'gemini',
      etiqueta: 'Google Gemini (respaldo)',
      ayuda: 'Clave de Google AI Studio (proyecto Familia). Se usa si Groq falla o llega a su cuota.',
      placeholder: 'AIza...',
      storageKey: 'gemini_familia_api_key',
      valor: '',
      paraTexto: true
    },
    {
      id: 'huggingface',
      etiqueta: 'Imágenes · Hugging Face',
      ayuda: 'Token gratuito de Hugging Face para generar ilustraciones. Empieza por hf_',
      placeholder: 'hf_...',
      storageKey: 'huggingface_familia_api_key',
      valor: '',
      paraTexto: false
    },
    {
      id: 'pollinations',
      etiqueta: 'Imágenes · Pollinations.ai',
      ayuda: 'API key de Pollinations.ai (opcional si el endpoint permite acceso sin clave).',
      placeholder: 'Clave de Pollinations...',
      storageKey: 'pollinations_familia_api_key',
      valor: '',
      paraTexto: false
    },
    {
      id: 'cloudflare',
      etiqueta: 'Imágenes · Cloudflare Workers AI',
      ayuda: 'Formato accountId:apiToken de Cloudflare Workers AI.',
      placeholder: 'accountId:apiToken',
      storageKey: 'cloudflare_imagen_api_key',
      valor: '',
      paraTexto: false
    }
  ];

  public authenticationService = inject(AutenticationService);

  constructor() {}

  ngOnInit(): void {
    this.cargarTokenDesdeStorage();
  }

  private get storageKey(): string {
    return this.tipoToken === 'ia' ? 'gemini_familia_api_key' : 'gh_travel_token';
  }

  private cargarTokenDesdeStorage(): void {
    if (this.tipoToken === 'ia') {
      this.cargarCamposIa();
      return;
    }
    this.tokenActual = localStorage.getItem(this.storageKey) || '';
  }

  private cargarCamposIa(): void {
    for (const campo of this.camposIa) {
      campo.valor = (localStorage.getItem(campo.storageKey) || '').trim();
    }

    // Migración: antes el campo de Gemini podía contener varias claves ("gsk_..., AIza...")
    const groq = this.campoIa('groq');
    const gemini = this.campoIa('gemini');
    const partes = gemini.valor.split(/[\s,;|]+/).filter(Boolean);
    if (partes.some((p) => p.startsWith('gsk_'))) {
      const clavegsk = partes.find((p) => p.startsWith('gsk_')) as string;
      if (!groq.valor) groq.valor = clavegsk;
      gemini.valor = partes.find((p) => !p.startsWith('gsk_')) ?? '';
    }

    this.actualizarTokenActualIa();
  }

  private campoIa(id: IdCampoIa): CampoTokenIa {
    return this.camposIa.find((c) => c.id === id) as CampoTokenIa;
  }

  private actualizarTokenActualIa(): void {
    // Solo sirve para saber si hay algo configurado (etiqueta/título del botón)
    this.tokenActual = this.camposIa.filter((c) => c.valor.trim()).map((c) => c.id).join(',');
  }

  onCampoInput(campo: CampoTokenIa, evento: Event): void {
    campo.valor = (evento.target as HTMLInputElement).value;
  }

  guardarTokensIa(): void {
    for (const campo of this.camposIa) {
      const limpio = (campo.valor ?? '').trim();
      campo.valor = limpio;
      if (limpio) {
        localStorage.setItem(campo.storageKey, limpio);
      } else {
        localStorage.removeItem(campo.storageKey);
      }
    }

    this.actualizarTokenActualIa();

    // Al padre solo le interesa si hay clave para texto (Groq/Gemini); la de imágenes no cuenta
    const clavesTexto = this.camposIa
      .filter((c) => c.paraTexto && c.valor)
      .map((c) => c.valor)
      .join(',');

    this.tokenGuardado.emit(clavesTexto);
    this.mostrarPanelToken = false;
  }

  guardarToken(token: string): void {
    const limpio = (token ?? '').trim();
    this.tokenActual = limpio;

    if (this.tipoToken === 'github') {
      this.authenticationService.guardarTokenGithub(limpio);
    } else if (limpio) {
      localStorage.setItem(this.storageKey, limpio);
    } else {
      localStorage.removeItem(this.storageKey);
    }

    this.tokenGuardado.emit(this.tokenActual);
  }
}
