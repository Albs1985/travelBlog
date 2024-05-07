import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AutenticationService } from 'src/app/services/autentication.service';
import { CommonService } from 'src/app/services/common.service';

@Component({
  selector: 'app-relato-boda-esteve',
  templateUrl: './relato-boda-esteve.component.html',
  styleUrls: ['./relato-boda-esteve.component.css']
})
export class RelatoBodaEsteveComponent {


  constructor (public authenticationService: AutenticationService){

    // this.commonService.sinIdioma$.next(true);
  }
  // ngOnDestroy(): void {
  //   // this.commonService.modoLibro$.next(false);
  //   // this.commonService.sinIdioma$.next(false);
  // }

  // public onClickCambiaModo(): void{
  //   // console.log(this.esModoLibro)
  //   this.esModoLibro = !this.esModoLibro;
  //   this.commonService.modoLibro$.next(this.esModoLibro);
  // }
}
