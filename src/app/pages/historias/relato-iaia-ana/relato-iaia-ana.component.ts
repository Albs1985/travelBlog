import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RelatosService } from 'src/app/services/relatos.service';

@Component({
  selector: 'app-relato-iaia-ana',
  templateUrl: './relato-iaia-ana.component.html',
  styleUrls: ['./relato-iaia-ana.component.css']
})
export class RelatoIaiaAnaComponent {
  constructor(private route: ActivatedRoute, public servicioRelatos : RelatosService){

  }
}
