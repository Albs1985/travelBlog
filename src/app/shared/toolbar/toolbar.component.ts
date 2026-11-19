import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AutenticationService } from 'src/app/services/autentication.service';
import { AppRoutingModule } from 'src/app/app-routing.module';

export type TipoTokenToolbar = 'github' | 'ia';

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
  @Input() mostrarBotonConfig: boolean = true;
  @Input() textoBotonExtra: string = '';
  @Input() iconoBotonExtra: string = '';
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
  mostrarPanelToken = false;

  public authenticationService = inject(AutenticationService);

  constructor() {}

  ngOnInit(): void {
    this.cargarTokenDesdeStorage();
  }

  private get storageKey(): string {
    return this.tipoToken === 'ia' ? 'gemini_familia_api_key' : 'gh_travel_token';
  }

  private cargarTokenDesdeStorage(): void {
    this.tokenActual = localStorage.getItem(this.storageKey) || '';
  }

  guardarToken(token: string): void {
    const limpio = (token ?? '').trim();
    this.tokenActual = limpio;

    if (limpio) {
      localStorage.setItem(this.storageKey, limpio);
    } else {
      localStorage.removeItem(this.storageKey);
    }

    this.tokenGuardado.emit(this.tokenActual);
    this.mostrarPanelToken = false;
  }
}
