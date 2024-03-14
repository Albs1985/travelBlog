import { Component, OnDestroy } from '@angular/core';
import { CommonService } from '../../services/common.service';

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.css']
})
export class GamesComponent implements OnDestroy {
  constructor(public commonService: CommonService){
    this.commonService.modoJuegos$.next(true);
  }
  ngOnDestroy(): void {
    this.commonService.modoJuegos$.next(false);
  }
}
