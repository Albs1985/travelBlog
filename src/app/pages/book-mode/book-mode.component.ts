import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CommonService } from 'src/app/services/common.service';

@Component({
  selector: 'app-book-mode',
  templateUrl: './book-mode.component.html',
  styleUrls: ['./book-mode.component.css']
})
export class BookModeComponent implements AfterViewInit, OnDestroy{

  constructor(private route: ActivatedRoute, private translate: TranslateService, public commonService : CommonService){

  }
  ngAfterViewInit(): void {
    console.log('ngAfterViewInit BookModeComponent');
    this.commonService.modoLibro$.next(true);
  }
  ngOnDestroy(): void {
    console.log('ngOnDestroy BookModeComponent');
    this.commonService.modoLibro$.next(false);
  }



}
