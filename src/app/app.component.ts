import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CumpleanosService } from './services/cumpleanos.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Familia Serrador Casares';
  cumpleanerosHoy$ = this.cumpleanosService.cumpleanerosHoy$;
  mostrarAvisoCumple = true;

  constructor(translate: TranslateService, public cumpleanosService: CumpleanosService){
    translate.setDefaultLang('val');
    translate.use('val');
    // translate.onLangChange.subscribe((event: LangChangeEvent) => {
    //   translate.get('app.title').subscribe((res: string) => {
    //     this.titleService.setTitle(res);
    //   });
    // });

  }
}
