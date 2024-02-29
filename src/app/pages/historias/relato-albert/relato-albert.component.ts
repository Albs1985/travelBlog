import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/common.service';
import { ViajerosService } from 'src/app/services/viajeros.service';

@Component({
  selector: 'app-relato-albert',
  templateUrl: './relato-albert.component.html',
  styleUrls: ['./relato-albert.component.css']
})
export class RelatoAlbertComponent implements OnDestroy {

  esModoLibro : boolean = false;

  constructor (private route: ActivatedRoute, public commonService : CommonService){
  }
  ngOnDestroy(): void {
    this.commonService.modoLibro$.next(false);
  }

  public onClickCambiaModo(): void{
    // console.log(this.esModoLibro)
    this.esModoLibro = !this.esModoLibro;
    this.commonService.modoLibro$.next(this.esModoLibro);
  }

}
