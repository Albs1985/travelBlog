import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonService } from 'src/app/services/common.service';
import { ViajesService } from 'src/app/services/viajes.service';
import { TextoLibro, paginarBloques } from 'src/app/shared/libro/libro.component';

/** Viaje que se enseña en el "modo libro" (id = fechaInicio_destino). */
const ID_VIAJE_LIBRO = '2023-03-12_Valdelinares';

@Component({
  selector: 'app-book-mode',
  templateUrl: './book-mode.component.html',
  styleUrls: ['./book-mode.component.css']
})
export class BookModeComponent implements AfterViewInit, OnDestroy {
  readonly paginas$: Observable<TextoLibro[][]> = this.viajesService
    .viaje(ID_VIAJE_LIBRO)
    .pipe(map((viaje) => (viaje ? paginarBloques(viaje.bloques) : [])));

  constructor(private viajesService: ViajesService, public commonService: CommonService) {}

  ngAfterViewInit(): void {
    this.commonService.modoLibro$.next(true);
  }

  ngOnDestroy(): void {
    this.commonService.modoLibro$.next(false);
  }
}
