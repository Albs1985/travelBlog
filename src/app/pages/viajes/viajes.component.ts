import { Component } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ViajesService } from '../../services/viajes.service';
import { AutenticationService } from 'src/app/services/autentication.service';

/** Un año con su portada y los destinos que se visitaron. */
export interface AnyoConDestinos {
  anyo: number;
  portada: string;
  destinos: string[];
}

@Component({
  selector: 'app-viajes',
  templateUrl: './viajes.component.html',
  styleUrls: ['./viajes.component.css']
})
export class ViajesComponent {
  /** true = años del más reciente al más antiguo (orden por defecto) */
  orderDesc = true;

  readonly anyos$: Observable<AnyoConDestinos[]> = combineLatest([
    this.servicioViajes.anyos$,
    this.servicioViajes.viajes$,
  ]).pipe(
    map(([anyos, viajes]) =>
      anyos.map((a) => ({
        anyo: a.anyo,
        portada: a.portada,
        destinos: viajes.filter((v) => v.anyo === a.anyo).map((v) => v.destino),
      }))
    )
  );

  constructor(public servicioViajes: ViajesService, public authenticationService: AutenticationService) {}

  ordenar(): void {
    this.orderDesc = !this.orderDesc;
  }

  ordenados(anyos: AnyoConDestinos[]): AnyoConDestinos[] {
    return this.orderDesc ? anyos : [...anyos].reverse();
  }
}
