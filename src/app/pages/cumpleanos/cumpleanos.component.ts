import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CumpleanosEnriquecido, CumpleanosItem, CumpleanosService } from '../../services/cumpleanos.service';

export interface DiaCalendario {
  dia: number;
  cumpleanos: CumpleanosEnriquecido[];
  esHoy: boolean;
}

export interface MesCalendario {
  numero: number; // 1..12
  claveMes: string; // '01'..'12' para 'mesAnyo.XX'
  cumpleanos: CumpleanosEnriquecido[];
  dias: DiaCalendario[];
  huecosInicio: number[];
}

const CLAVES_MESES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

@Component({
  selector: 'app-cumpleanos',
  templateUrl: './cumpleanos.component.html',
  styleUrls: ['./cumpleanos.component.css']
})
export class CumpleanosComponent implements OnInit {
  readonly lista$: Observable<CumpleanosEnriquecido[]> = this.cumpleanosService.lista$;
  readonly hoy$: Observable<CumpleanosEnriquecido[]> = this.cumpleanosService.cumpleanerosHoy$;

  modoVista: 'calendario' | 'tarjetas' = 'calendario';
  mesSeleccionado: number = new Date().getMonth() + 1;

  githubToken: string = localStorage.getItem('gh_travel_token') || '';
  mostrarPanelToken = false;
  cargandoAccion = false;

  readonly meses$: Observable<MesCalendario[]> = this.lista$.pipe(
    map((todos) => {
      const hoy = new Date();
      const anyoActual = hoy.getFullYear();

      return CLAVES_MESES.map((claveMes, idx) => {
        const numeroMes = idx + 1;
        const cumplesMes = todos
          .filter((c) => c.mes === numeroMes)
          .sort((a, b) => a.dia - b.dia);

        const totalDias = new Date(anyoActual, numeroMes, 0).getDate();
        const primerDiaSemana = (new Date(anyoActual, idx, 1).getDay() + 6) % 7;
        const huecosInicio = Array.from({ length: primerDiaSemana }, (_, i) => i);

        const dias: DiaCalendario[] = Array.from({ length: totalDias }, (_, dIdx) => {
          const diaNum = dIdx + 1;
          const delDia = cumplesMes.filter((c) => c.dia === diaNum);
          const esHoy = hoy.getMonth() === idx && hoy.getDate() === diaNum;

          return {
            dia: diaNum,
            cumpleanos: delDia,
            esHoy
          };
        });

        return {
          numero: numeroMes,
          claveMes,
          cumpleanos: cumplesMes,
          dias,
          huecosInicio
        };
      });
    })
  );

  readonly mesesOpciones = CLAVES_MESES.map((clave, idx) => ({
    numero: idx + 1,
    clave
  }));

  readonly diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  mostrarFormulario = false;
  editandoId: string | null = null;
  avisoHoyCerrado = false;

  form: Omit<CumpleanosItem, 'id'> = {
    nombre: '',
    dia: 1,
    mes: new Date().getMonth() + 1,
    anyoNacimiento: undefined,
    nota: ''
  };

  constructor(public cumpleanosService: CumpleanosService) {}

  ngOnInit(): void {
    this.cumpleanosService.cargarDesdeJson().subscribe();
  }

  guardarToken(token: string): void {
    this.githubToken = token.trim();
    localStorage.setItem('gh_travel_token', this.githubToken);
    this.mostrarPanelToken = false;
  }

  claveMes(mes: number): string {
    const idx = ((mes - 1) % 12 + 12) % 12;
    return CLAVES_MESES[idx];
  }

  alternarVista(): void {
    this.modoVista = this.modoVista === 'calendario' ? 'tarjetas' : 'calendario';
  }

  cambiarMes(delta: number): void {
    const siguiente = ((this.mesSeleccionado - 1 + delta) % 12 + 12) % 12;
    this.mesSeleccionado = siguiente + 1;
  }

  abrirNuevo(diaPreseleccionado?: number, mesPreseleccionado?: number): void {
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }
    this.editandoId = null;
    this.form = {
      nombre: '',
      dia: diaPreseleccionado ?? 1,
      mes: mesPreseleccionado ?? this.mesSeleccionado,
      anyoNacimiento: undefined,
      nota: ''
    };
    this.mostrarFormulario = true;
  }

  abrirEditar(item: CumpleanosEnriquecido): void {
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }
    this.editandoId = item.id;
    this.form = {
      nombre: item.nombre,
      dia: item.dia,
      mes: item.mes,
      anyoNacimiento: item.anyoNacimiento,
      nota: item.nota ?? ''
    };
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    if (this.cargandoAccion) {
      return;
    }
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  guardar(): void {
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }

    const nombreLimpio = (this.form.nombre ?? '').trim();
    if (!nombreLimpio || this.cargandoAccion) {
      return;
    }

    const payload: Omit<CumpleanosItem, 'id'> = {
      nombre: nombreLimpio,
      dia: Math.max(1, Math.min(31, Number(this.form.dia) || 1)),
      mes: Math.max(1, Math.min(12, Number(this.form.mes) || 1)),
      anyoNacimiento:
        this.form.anyoNacimiento !== undefined &&
        this.form.anyoNacimiento !== null &&
        String(this.form.anyoNacimiento).trim() !== ''
          ? Number(this.form.anyoNacimiento)
          : undefined,
      nota: (this.form.nota ?? '').trim()
    };

    this.cargandoAccion = true;

    const peticion$ = this.editandoId
      ? this.cumpleanosService.actualizar({ id: this.editandoId, ...payload }, this.githubToken)
      : this.cumpleanosService.agregar(payload, this.githubToken);

    peticion$.subscribe({
      next: () => {
        this.cargandoAccion = false;
        this.mostrarFormulario = false;
        this.editandoId = null;
      },
      error: (err) => {
        this.cargandoAccion = false;
        console.error(err);
        alert('Error al guardar el cumpleaños en GitHub.');
      }
    });
  }

  eliminar(item: CumpleanosEnriquecido): void {
    if (!this.githubToken) {
      alert('Introduce el token de administrador.');
      this.mostrarPanelToken = true;
      return;
    }

    if (this.cargandoAccion) {
      return;
    }

    if (confirm(`¿Eliminar el cumpleaños de ${item.nombre}?`)) {
      this.cargandoAccion = true;
      this.cumpleanosService.eliminar(item.id, this.githubToken).subscribe({
        next: () => {
          this.cargandoAccion = false;
          if (this.editandoId === item.id) {
            this.mostrarFormulario = false;
            this.editandoId = null;
          }
        },
        error: (err) => {
          this.cargandoAccion = false;
          console.error(err);
          alert('Error al eliminar el cumpleaños en GitHub.');
        }
      });
    }
  }

  mostrarAvatar(item: CumpleanosEnriquecido): void {
    item.foto = 'assets/icons/avatar.png';
  }
}
