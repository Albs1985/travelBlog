import { Component } from '@angular/core';
import { RelatosService } from '../../services/relatos.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-relatos',
  templateUrl: './relatos.component.html',
  styleUrls: ['./relatos.component.css']
})
export class RelatosComponent {

  constructor(private route: ActivatedRoute, public servicioRelatos : RelatosService){

  }

}
