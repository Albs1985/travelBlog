import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/common.service';

@Component({
  selector: 'app-relato-iaia-ana',
  templateUrl: './relato-iaia-ana.component.html',
  styleUrls: ['./relato-iaia-ana.component.css']
})
export class RelatoIaiaAnaComponent {
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
