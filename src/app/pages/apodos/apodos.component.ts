import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ViajerosService } from 'src/app/services/viajeros.service';

@Component({
  selector: 'app-apodos',
  templateUrl: './apodos.component.html',
  styleUrls: ['./apodos.component.css']
})
export class ApodosComponent {

  // p: number = 1; // Página inicial
  // pageSize: number = 10; // Elementos por página
  // maxSizeDisplay: number = 10;


  constructor(private route: ActivatedRoute, private translate: TranslateService, public viajerosService: ViajerosService){
    // this.maxSizeDisplay = 10;
    this.viajerosService.cargarViajeros();
  }

}
