import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ViajesService } from './services/viajes.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Familia Serrador Casares';

  constructor(servicioViajes : ViajesService, translate: TranslateService){
    translate.setDefaultLang('val');
    translate.use('val');
    // translate.onLangChange.subscribe((event: LangChangeEvent) => {
    //   translate.get('app.title').subscribe((res: string) => {
    //     this.titleService.setTitle(res);
    //   });
    // });

  }
}
