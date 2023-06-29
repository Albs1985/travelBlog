import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-book-mode',
  templateUrl: './book-mode.component.html',
  styleUrls: ['./book-mode.component.css']
})
export class BookModeComponent {

  constructor(private route: ActivatedRoute, private translate: TranslateService){}

}
