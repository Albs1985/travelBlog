import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { FrasesService } from 'src/app/services/frases.service';

@Component({
  selector: 'app-frases',
  templateUrl: './frases.component.html',
  styleUrls: ['./frases.component.css']
})
export class FrasesComponent {

  constructor(private route: ActivatedRoute, private translate: TranslateService, public servicioFrases: FrasesService){
    this.servicioFrases.cargarFrases();
  }

}
