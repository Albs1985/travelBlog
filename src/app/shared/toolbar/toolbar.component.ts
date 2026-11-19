import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AutenticationService } from 'src/app/services/autentication.service';
import { AppRoutingModule } from 'src/app/app-routing.module';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent {
  // Configuración de rutas y textos mediante Inputs
  @Input() volverLink: string = '/principal';
  @Input() textoNuevo: string = 'app.nuevoElemento';
  @Input() mostrarBotonNuevo: boolean = true;
  @Input() mostrarBotonConfig: boolean = true;
  @Input() textoBotonExtra: string = '';
  @Input() iconoBotonExtra: string = '';

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

  // Gestión interna del Token de GitHub y su panel
  githubToken: string = localStorage.getItem('gh_travel_token') || '';
  mostrarPanelToken = false;

  public authenticationService = inject(AutenticationService)

  constructor() {}

  guardarToken(token: string): void {
    this.githubToken = token.trim();
    localStorage.setItem('gh_travel_token', this.githubToken);
    this.mostrarPanelToken = false;
  }
}
