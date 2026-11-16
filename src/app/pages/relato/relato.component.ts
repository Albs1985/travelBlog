import { Component, OnDestroy } from '@angular/core';
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
export class RelatoComponent implements OnDestroy {
  fotoAbierta: number | null = null;
  esModoLibro = false;

  /** null mientras carga; si no existe el relato, `relato` es undefined. */
  readonly vista$: Observable<VistaRelato | { relato: undefined }> = this.route.paramMap.pipe(
    map((p) => p.get('slug') ?? ''),
    switchMap((slug) => this.contenido.relato(slug)),
    tap((relato) => {
      this.esModoLibro = false;
      this.commonService.modoLibro$.next(false);
      this.commonService.sinIdioma$.next(!!relato?.sinIdioma);
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

  esVista(v: VistaRelato | { relato: undefined }): v is VistaRelato {
    return v.relato !== undefined;
  }

  /** Cada relato puede usar la contraseña general o la propia de los relatos de la familia. */
  estaAutenticado(relato?: Relato): boolean {
    return relato?.protegido ? this.authenticationService.isLoggedInRelatoIaia() : this.authenticationService.isLoggedIn();
  }

  cambiarModo(): void {
    this.esModoLibro = !this.esModoLibro;
    this.commonService.modoLibro$.next(this.esModoLibro);
  }

  ngOnDestroy(): void {
    this.commonService.modoLibro$.next(false);
    this.commonService.sinIdioma$.next(false);
  }
}
