import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViajerosService } from 'src/app/services/viajeros.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {


  constructor (private route: ActivatedRoute, 
              public viajerosService : ViajerosService){                  
                
                viajerosService.cargarViajeros();
  }

}
