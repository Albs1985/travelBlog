import { Component, inject } from '@angular/core';
import { ViajerosService } from 'src/app/services/viajeros.service';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.css']
})
export class PrincipalComponent {

  public viajerosService = inject(ViajerosService);
  constructor(){}
}
