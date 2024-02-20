import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/common.service';
import { ViajerosService } from 'src/app/services/viajeros.service';

@Component({
  selector: 'app-relato-albert',
  templateUrl: './relato-albert.component.html',
  styleUrls: ['./relato-albert.component.css']
})
export class RelatoAlbertComponent {

  // esModoLibro$ : BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  esModoLibro : boolean = false;

  constructor (private route: ActivatedRoute,public viajerosService : ViajerosService, public commonService : CommonService){
    viajerosService.cargarViajeros();
  }

  public onClickCambiaModo(): void{
    this.esModoLibro = !this.esModoLibro;
    this.commonService.modoLibro$.next(this.esModoLibro);
  }

}
