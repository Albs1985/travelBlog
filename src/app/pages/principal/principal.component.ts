import { Component, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { AutenticationService } from 'src/app/services/autentication.service';
import { ViajerosService } from 'src/app/services/viajeros.service';
import { ViajesService } from 'src/app/services/viajes.service';
import { AnyoConDestinos } from '../viajes/viajes.component';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.css']
})
export class PrincipalComponent {

  public viajerosService = inject(ViajerosService);
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

}
