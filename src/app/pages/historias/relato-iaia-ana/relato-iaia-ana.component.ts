import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AutenticationService } from 'src/app/services/autentication.service';
import { CommonService } from 'src/app/services/common.service';

@Component({
  selector: 'app-relato-iaia-ana',
  templateUrl: './relato-iaia-ana.component.html',
  styleUrls: ['./relato-iaia-ana.component.css']
})
export class RelatoIaiaAnaComponent {
  esModoLibro : boolean = false;
  edadIaia : number = 0;

  constructor (private route: ActivatedRoute, public commonService : CommonService, public authenticationService: AutenticationService){
    //Cálculo de la edad en años
    let date = new Date('1953-11-16');
    let timeDiff = Math.abs(Date.now() - date.getTime());
    this.edadIaia = Math.floor((timeDiff / (1000 * 3600 * 24))/365.25);
    this.commonService.sinIdioma$.next(true);
  }
  ngOnDestroy(): void {
    this.commonService.modoLibro$.next(false);
    this.commonService.sinIdioma$.next(false);
  }

  public onClickCambiaModo(): void{
    // console.log(this.esModoLibro)
    this.esModoLibro = !this.esModoLibro;
    this.commonService.modoLibro$.next(this.esModoLibro);
  }
}
