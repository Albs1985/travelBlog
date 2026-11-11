import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonService } from 'src/app/services/common.service';
import { ViajesService } from 'src/app/services/viajes.service';
import { Bloque, Texto } from 'src/app/interfaces/viaje.interface';

/** Viaje que se enseña en el "modo libro" (id = fechaInicio_destino). */
const ID_VIAJE_LIBRO = '2023-03-12_Valdelinares';
/** El CSS del libro tiene preparadas 6 hojas: 5 de texto + la contraportada. */
const MAX_PAGINAS_TEXTO = 5;
const MAX_PARRAFOS_POR_PAGINA = 3;

export interface TextoLibro {
  tipo: 'titulo' | 'parrafo' | 'nota' | 'cita';
  texto: Texto;
}

@Component({
  selector: 'app-book-mode',
  templateUrl: './book-mode.component.html',
  styleUrls: ['./book-mode.component.css']
})
export class BookModeComponent implements AfterViewInit, OnDestroy {
  /** Los textos del viaje repartidos en páginas. */
  readonly paginas$: Observable<TextoLibro[][]> = this.viajesService
    .viaje(ID_VIAJE_LIBRO)
    .pipe(map((viaje) => (viaje ? this.paginar(viaje.bloques) : [])));

  constructor(private viajesService: ViajesService, public commonService: CommonService) {}

  ngAfterViewInit(): void {
    this.commonService.modoLibro$.next(true);
  }

  ngOnDestroy(): void {
    this.commonService.modoLibro$.next(false);
  }

  private paginar(bloques: Bloque[]): TextoLibro[][] {
    const paginas: TextoLibro[][] = [];
    let actual: TextoLibro[] = [];
    let parrafos = 0;
    for (const b of bloques) {
      if (b.tipo === 'fotos' || b.tipo === 'mapa') continue;
      const llena = parrafos >= MAX_PARRAFOS_POR_PAGINA;
      if (actual.length > 0 && (b.tipo === 'titulo' || llena) && paginas.length < MAX_PAGINAS_TEXTO - 1) {
        paginas.push(actual);
        actual = [];
        parrafos = 0;
      }
      actual.push({ tipo: b.tipo, texto: b.texto });
      if (b.tipo !== 'titulo') parrafos++;
    }
    if (actual.length > 0) paginas.push(actual);
    return paginas;
  }
}
