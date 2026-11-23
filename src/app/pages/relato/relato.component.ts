import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Relato } from '../../interfaces/contenido.interface';
import { ContenidoService } from '../../services/contenido.service';
import { AutenticationService } from '../../services/autentication.service';
import { CommonService } from '../../services/common.service';
import { VistaBloques, prepararBloques } from '../../services/bloques.util';
import { calcularEdad } from '../../services/buscar.util';
import { TextoLibro, paginarBloques } from '../../shared/libro/libro.component';

export interface VistaRelato extends VistaBloques {
  relato: Relato;
  edad?: number;
  paginas: TextoLibro[][];
}

/**
 * Página de un relato (/historias/<nombre>). Todo sale de content/relatos/<nombre>.json:
 * para añadir un relato nuevo no hay que tocar código.
 */
@Component({
  selector: 'app-relato',
  templateUrl: './relato.component.html',
  styleUrls: ['./relato.component.css'],
})
export class RelatoComponent implements OnInit, OnDestroy {
  fotoAbierta: number | null = null;
  tokenValido = false;
  validandoToken = false;
  errorValidacionToken = '';

  /** null mientras carga; si no existe el relato, `relato` es undefined. */
  readonly vista$: Observable<VistaRelato | { relato: undefined }> = this.route.paramMap.pipe(
    map((p) => p.get('slug') ?? ''),
    switchMap((slug) => this.contenido.relato(slug)),
    tap((relato) => {
      this.commonService.modoLibro$.next(false);
      this.commonService.sinIdioma$.next(!!relato?.sinIdioma);
      if (relato?.protegido) {
        this.comprobarTokenGitHub();
      }
    }),
    map((relato) =>
      relato
        ? {
            relato,
            ...prepararBloques(relato.bloques, [], relato.portada ? [relato.portada] : []),
            edad: relato.nacimiento ? calcularEdad(relato.nacimiento) : undefined,
            paginas: paginarBloques(relato.bloques),
          }
        : { relato: undefined }
    )
  );

  constructor(
    private route: ActivatedRoute,
    private contenido: ContenidoService,
    public authenticationService: AutenticationService,
    public commonService: CommonService
  ) {}

  ngOnInit(): void {
    if (this.authenticationService.obtenerTokenGithub()) {
      this.comprobarTokenGitHub();
    }
  }

  esVista(v: VistaRelato | { relato: undefined }): v is VistaRelato {
    return v.relato !== undefined;
  }

  tieneTokenAdmin(): boolean {
    return this.tokenValido;
  }

  onTokenGuardado(nuevoToken: string): void {
    this.authenticationService.limpiarCacheValidacion();
    this.comprobarTokenGitHub(nuevoToken, true);
  }

  comprobarTokenGitHub(token?: string, forzarRefresco = false): void {
    const valor = (token ?? this.authenticationService.obtenerTokenGithub()).trim();
    this.errorValidacionToken = '';

    if (!valor) {
      this.tokenValido = false;
      this.validandoToken = false;
      return;
    }

    this.validandoToken = true;
    this.authenticationService.validarTokenGithub(valor, forzarRefresco).subscribe({
      next: (res) => {
        this.validandoToken = false;
        this.tokenValido = res.valido;
        if (!res.valido) {
          if (res.motivo === 'invalido') {
            this.errorValidacionToken = 'El token de GitHub no es válido o ha caducado.';
          } else if (res.motivo === 'sin_acceso_repo') {
            this.errorValidacionToken = 'El token es válido en GitHub pero no tiene acceso al repositorio.';
          } else {
            this.errorValidacionToken = 'No se ha podido comprobar el token con GitHub.';
          }
        }
      },
      error: () => {
        this.validandoToken = false;
        this.tokenValido = false;
        this.errorValidacionToken = 'No se ha podido comprobar el token con GitHub.';
      }
    });
  }

  ngOnDestroy(): void {
    this.commonService.modoLibro$.next(false);
    this.commonService.sinIdioma$.next(false);
  }
}
