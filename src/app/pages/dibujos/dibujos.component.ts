import { Component } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Dibujo } from '../../interfaces/contenido.interface';
import { FotoViaje } from '../../interfaces/viaje.interface';
import { ContenidoService } from '../../services/contenido.service';
import { DibujosService } from '../../services/dibujos.service';
import { AutenticationService } from '../../services/autentication.service';
import { filtrar } from '../../services/buscar.util';

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
  archivoSeleccionado: File | null = null;

  // 👈 NUEVO: Control de elementos que se están eliminando actualmente
  idsEliminando: Set<number | string> = new Set();

  dibujoForm: Dibujo = {
    persona: 'Mateu',
    anyo: new Date().getFullYear().toString(),
    edad: '',
    detalle: '',
    src: ''
  };

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

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files[0]) {
      this.archivoSeleccionado = event.target.files[0];
    }
  }

  guardarDibujo(): void {
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }
    if (!this.archivoSeleccionado || !this.dibujoForm.persona) {
      alert('Selecciona una imagen y cubre los datos obligatorios.');
      return;
    }

    this.cargandoAccion = true;
    this.dibujosService.agregarDibujo(this.dibujoForm, this.archivoSeleccionado, this.githubToken).subscribe({
      next: () => {
        this.cargandoAccion = false;
        this.mostrarFormulario = false;
        this.archivoSeleccionado = null;
        this.contenido.invalidarCache('dibujos');
        this.buscar('');
      },
      error: (err) => {
        this.cargandoAccion = false;
        console.error(err);
        alert('Error al subir el dibujo a GitHub.');
      }
    });
  }

  eliminar(id: number | string | undefined, event: Event): void {
    // 👈 EVITAMOS QUE EL EVENTO NAVEGUE AL HOME O ABRA EL LIGHTBOX
    event.stopPropagation();
    event.preventDefault();

    if (!id) return;
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este dibujo?')) {
      // 1. Marcamos el dibujo como "procesando/eliminando"
      this.idsEliminando.add(id);

      this.dibujosService.eliminarDibujo(id, this.githubToken).subscribe({
        next: () => {
          this.idsEliminando.delete(id);
          this.contenido.invalidarCache('dibujos');
          this.buscar('');
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
