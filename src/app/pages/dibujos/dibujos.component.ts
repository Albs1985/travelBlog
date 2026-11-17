import { Component } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Dibujo } from '../../interfaces/contenido.interface';
import { FotoViaje } from '../../interfaces/viaje.interface';
import { ContenidoService } from '../../services/contenido.service';
import { DibujosService } from '../../services/dibujos.service';
import { AutenticationService } from '../../services/autentication.service';
import { filtrar } from '../../services/buscar.util';

// Interfaz auxiliar para la cola de subida múltiple
export interface DibujoPendiente {
  file: File;
  previewUrl: string;
  persona: string;
  anyo: string;
  edad: string;
  detalle: string;
}

@Component({
  selector: 'app-dibujos',
  templateUrl: './dibujos.component.html',
  styleUrls: ['./dibujos.component.css']
})
export class DibujosComponent {
  p = 1;
  pageSize = 10;
  maxSizeDisplay = 10;
  abierto: number | null = null;

  githubToken: string = localStorage.getItem('gh_travel_token') || '';
  mostrarPanelToken = false;
  mostrarFormulario = false;
  cargandoAccion = false;

  // 👈 NUEVA COLA DE DIBUJOS PENDIENTES
  dibujosPendientes: DibujoPendiente[] = [];

  idsEliminando: Set<number | string> = new Set();

  private readonly termino$ = new BehaviorSubject<string>('');

  readonly vista$: Observable<{ dibujos: Dibujo[]; fotos: FotoViaje[] }> = combineLatest([
    this.dibujosService.dibujos$,
    this.termino$,
  ]).pipe(
    map(([todos, termino]) => {
      const dibujos = filtrar(todos, termino, (d) => [d.persona, d.anyo, d.edad, d.detalle]);
      return {
        dibujos,
        fotos: dibujos.map((d) => ({ src: d.src, desc: d.detalle })) as unknown as FotoViaje[]
      };
    })
  );

  constructor(
    private contenido: ContenidoService,
    private dibujosService: DibujosService,
    public authenticationService: AutenticationService
  ) {}

  buscar(termino: string): void {
    this.p = 1;
    this.termino$.next(termino);
  }

  posicion(indiceEnPagina: number): number {
    return (this.p - 1) * this.pageSize + indiceEnPagina;
  }

  guardarToken(token: string): void {
    this.githubToken = token.trim();
    localStorage.setItem('gh_travel_token', this.githubToken);
    this.mostrarPanelToken = false;
  }

  // 👈 CAPTURA MÚLTIPLE DE FICHEROS Y CREA LA COLA
  onFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      const anioActual = new Date().getFullYear().toString();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewUrl = URL.createObjectURL(file);

        this.dibujosPendientes.push({
          file: file,
          previewUrl: previewUrl,
          persona: 'Mateu', // Valor por defecto
          anyo: anioActual,
          edad: '',
          detalle: ''
        });
      }
    }
  }

  quitarPendiente(index: number): void {
    this.dibujosPendientes.splice(index, 1);
  }

  guardarTodos(): void {
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }
    if (this.dibujosPendientes.length === 0) {
      alert('Selecciona al menos una imagen.');
      return;
    }

    this.cargandoAccion = true;
    this.dibujosService.agregarMultiplesDibujos(this.dibujosPendientes, this.githubToken).subscribe({
      next: () => {
        this.cargandoAccion = false;
        this.mostrarFormulario = false;
        this.dibujosPendientes = [];
        this.contenido.invalidarCache('dibujos');
        this.buscar('');
      },
      error: (err) => {
        this.cargandoAccion = false;
        console.error(err);
        alert('Error al subir los dibujos a GitHub.');
      }
    });
  }

  eliminar(id: number | string | undefined, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!id) return;
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este dibujo?')) {
      this.idsEliminando.add(id);
      this.dibujosService.eliminarDibujo(id, this.githubToken).subscribe({
        next: () => {
          // this.idsEliminando.delete(id);
          this.contenido.invalidarCache('dibujos');
          // this.buscar('');
        },
        error: (err) => {
          this.idsEliminando.delete(id);
          console.error(err);
          alert('Error al eliminar el dibujo en GitHub.');
        }
      });
    }
  }
}
