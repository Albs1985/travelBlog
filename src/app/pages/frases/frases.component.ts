import { Component } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, switchMap, startWith } from 'rxjs/operators';
import { Frase } from '../../interfaces/contenido.interface';
import { FrasesService } from '../../services/frases.service';
import { AutenticationService } from '../../services/autentication.service';

@Component({
  selector: 'app-frases',
  templateUrl: './frases.component.html',
  styleUrls: ['./frases.component.css']
})
export class FrasesComponent {
  p = 1;
  pageSize = 25;
  maxSizeDisplay = 10;

  // Control de Token y UI de edición
  githubToken: string = localStorage.getItem('gh_travel_token') || '';
  mostrarPanelToken = false;
  mostrarFormulario = false;
  modoEdicion = false;
  cargandoAccion = false;

  // 👈 NUEVO: Control de elementos que se están eliminando actualmente
  idsEliminando: Set<number | string> = new Set();

  // Objeto formulario
  fraseForm: Frase = this.inicializarFraseVacia();

  private readonly termino$ = new BehaviorSubject<string>('');
  private readonly recargar$ = new BehaviorSubject<void>(undefined);

  readonly frases$: Observable<Frase[]> = combineLatest([
    this.termino$,
    this.recargar$.pipe(startWith(undefined))
  ]).pipe(
    switchMap(([termino]) => this.servicioFrases.obtenerFrasesYFiltrar(termino)),
    map(frases => [...frases].sort((a, b) =>
      Number(b.fecha) - Number(a.fecha) || Number(b.id) - Number(a.id)
    ))
  );

  constructor(public servicioFrases: FrasesService, public authenticationService: AutenticationService) {}

  buscar(termino: string): void {
    this.p = 1;
    this.termino$.next(termino);
  }

  recargarLista(): void {
    this.recargar$.next();
  }

  guardarToken(token: string): void {
    this.githubToken = token.trim();
    localStorage.setItem('gh_travel_token', this.githubToken);
    this.mostrarPanelToken = false;
  }

  inicializarFraseVacia(): Frase {
    return {
      id: 0,
      persona: 'Mateu',
      fecha: new Date().getFullYear().toString(),
      frase: '',
      explicacion: ''
    };
  }

  abrirCrear(): void {
    this.modoEdicion = false;
    this.fraseForm = this.inicializarFraseVacia();
    this.mostrarFormulario = true;
  }

  abrirEditar(frase: Frase): void {
    this.modoEdicion = true;
    this.fraseForm = JSON.parse(JSON.stringify(frase));
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
  }

  guardarFrase(): void {
    if (!this.githubToken) {
      alert('Por favor, introduce primero tu token de GitHub.');
      this.mostrarPanelToken = true;
      return;
    }

    if (!this.fraseForm.frase || !this.fraseForm.persona) {
      alert('La persona y la frase en español son obligatorias.');
      return;
    }

    this.cargandoAccion = true;

    const peticion = this.modoEdicion
      ? this.servicioFrases.editarFrase(this.fraseForm, this.githubToken)
      : this.servicioFrases.agregarFrase(this.fraseForm, this.githubToken);

    peticion.subscribe({
      next: () => {
        this.cargandoAccion = false;
        this.cerrarFormulario();
        this.recargarLista();
      },
      error: (err) => {
        this.cargandoAccion = false;
        console.error('Error detallado de GitHub:', err);
        const mensajeGitHub = err.error?.message || err.message || 'Desconocido';
        alert(`Error al guardar en GitHub: ${mensajeGitHub}`);
      }
    });
  }

  eliminar(id: number | string | undefined, event: Event): void {
    // 👈 Evitamos cualquier propagación o comportamiento por defecto del evento
    event.stopPropagation();
    event.preventDefault();

    if (!id) return;
    if (!this.githubToken) {
      alert('Por favor, introduce primero tu token de GitHub.');
      this.mostrarPanelToken = true;
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este recuerdo?')) {
      // 1. Añadimos el ID al Set para bloquear y mostrar estado visual de carga
      this.idsEliminando.add(id);

      this.servicioFrases.eliminarFrase(Number(id), this.githubToken).subscribe({
        next: () => {
          this.idsEliminando.delete(id);
          this.recargarLista();
        },
        error: (err) => {
          this.idsEliminando.delete(id);
          console.error(err);
          alert('Error al eliminar en GitHub.');
        }
      });
    }
  }
}
