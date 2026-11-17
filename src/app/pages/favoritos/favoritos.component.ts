import { Component } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FotoFavorita } from '../../interfaces/contenido.interface';
import { FotoViaje } from '../../interfaces/viaje.interface';
import { ContenidoService } from '../../services/contenido.service';
import { FavoritosService, FotoFavoritaPendiente } from '../../services/favoritos.service';
import { ViajerosService } from '../../services/viajeros.service';
import { AutenticationService } from '../../services/autentication.service';
import { filtrar } from '../../services/buscar.util';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrls: ['./favoritos.component.css']
})
export class FavoritosComponent {
  orderDesc = false;
  p = 1;
  pageSize = 10;
  maxSizeDisplay = 5;
  abierta: number | null = null;

  // Control de token, formulario y cola por lotes
  githubToken: string = localStorage.getItem('gh_travel_token') || '';
  mostrarPanelToken = false;
  mostrarFormulario = false;
  cargandoAccion = false;
  fotosPendientes: FotoFavoritaPendiente[] = [];

  // Control de elementos eliminándose
  idsEliminando: Set<string> = new Set();

  private readonly termino$ = new BehaviorSubject<string>('');
  private readonly invertido$ = new BehaviorSubject<boolean>(false);

  readonly vista$: Observable<{ fotos: FotoFavorita[]; visor: FotoViaje[] }> = combineLatest([
    this.favoritosService.favoritos$,
    this.termino$,
    this.invertido$,
  ]).pipe(
    map(([todas, termino, invertido]) => {
      const filtradas = filtrar(todas, termino, (f) => [
        f.anyo,
        f.lugar || '',
        f.etiquetas || '',
        f.personas ? f.personas.join(', ') : '',
        f.desc || ''
      ]);
      const fotos = invertido ? [...filtradas].reverse() : filtradas;
      return {
        fotos,
        visor: fotos.map((f) => ({ src: f.src, desc: f.desc })) as unknown as FotoViaje[],
      };
    })
  );

  constructor(
    private contenido: ContenidoService,
    private favoritosService: FavoritosService,
    public viajerosService: ViajerosService,
    public authenticationService: AutenticationService
  ) {}

  buscar(termino: string): void {
    this.p = 1;
    this.termino$.next(termino);
  }

  ordenar(): void {
    this.orderDesc = !this.orderDesc;
    this.invertido$.next(this.orderDesc);
  }

  posicion(indiceEnPagina: number): number {
    return (this.p - 1) * this.pageSize + indiceEnPagina;
  }

  guardarToken(token: string): void {
    this.githubToken = token.trim();
    localStorage.setItem('gh_travel_token', this.githubToken);
    this.mostrarPanelToken = false;
  }

  onFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      const anioActual = new Date().getFullYear().toString();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewUrl = URL.createObjectURL(file);

        this.fotosPendientes.push({
          file: file,
          previewUrl: previewUrl,
          anyo: anioActual,
          lugar: '',
          etiquetas: '',
          personasStr: '',
          desc: ''
        });
      }
    }
  }

  quitarPendiente(index: number): void {
    this.fotosPendientes.splice(index, 1);
  }

  guardarTodos(): void {
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }
    if (this.fotosPendientes.length === 0) {
      alert('Selecciona al menos una imagen.');
      return;
    }

    this.cargandoAccion = true;
    this.favoritosService.agregarMultiplesFavoritos(this.fotosPendientes, this.githubToken).subscribe({
      next: () => {
        this.cargandoAccion = false;
        this.mostrarFormulario = false;
        this.fotosPendientes = [];
        this.contenido.invalidarCache('favoritos');
        this.buscar('');
      },
      error: (err) => {
        this.cargandoAccion = false;
        console.error(err);
        alert('Error al subir las fotos favoritas a GitHub.');
      }
    });
  }

  eliminar(src: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!src) return;
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar esta foto favorita?')) {
      this.idsEliminando.add(src);
      this.favoritosService.eliminarFavorito(src, this.githubToken).subscribe({
        next: () => {
          this.idsEliminando.delete(src);
          this.contenido.invalidarCache('favoritos');
          this.buscar('');
        },
        error: (err) => {
          this.idsEliminando.delete(src);
          console.error(err);
          alert('Error al eliminar la foto en GitHub.');
        }
      });
    }
  }

  // 👈 NUEVO: Control de selección múltiple para borrado masivo
  seleccionadasParaBorrar: Set<string> = new Set();
  modoSeleccionMultiple = false;

  toggleSeleccion(src: string): void {
    if (this.seleccionadasParaBorrar.has(src)) {
      this.seleccionadasParaBorrar.delete(src);
    } else {
      this.seleccionadasParaBorrar.add(src);
    }
  }

  seleccionarTodas(fotosActuales: FotoFavorita[]): void {
    if (this.seleccionadasParaBorrar.size === fotosActuales.length) {
      this.seleccionadasParaBorrar.clear();
    } else {
      fotosActuales.forEach(f => this.seleccionadasParaBorrar.add(f.src));
    }
  }

  eliminarSeleccionadas(): void {
    if (this.seleccionadasParaBorrar.size === 0) return;
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }

    if (confirm(`¿Estás seguro de que deseas eliminar las ${this.seleccionadasParaBorrar.size} fotos seleccionadas?`)) {
      const srcsArray = Array.from(this.seleccionadasParaBorrar);

      // Marcamos todas las seleccionadas en el set de eliminando
      srcsArray.forEach(src => this.idsEliminando.add(src));
      const totalAEliminar = srcsArray.length;

      this.favoritosService.eliminarMultiplesFavoritos(srcsArray, this.githubToken).subscribe({
        next: () => {
          srcsArray.forEach(src => this.idsEliminando.delete(src));
          this.seleccionadasParaBorrar.clear();
          this.modoSeleccionMultiple = false;
          this.contenido.invalidarCache('favoritos');
          this.buscar('');
        },
        error: (err) => {
          srcsArray.forEach(src => this.idsEliminando.delete(src));
          console.error(err);
          alert('Error al eliminar el lote de fotos en GitHub.');
        }
      });
    }
  }
}
