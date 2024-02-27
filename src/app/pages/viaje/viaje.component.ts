import { Component, OnInit/*, ElementRef, ViewChild, AfterViewInit*/ } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViajesService } from '../../services/viajes.service';
import { FotosService } from 'src/app/services/fotos.service';

@Component({
  selector: 'app-viaje',
  templateUrl: './viaje.component.html',
  styleUrls: ['./viaje.component.css']
})
export class ViajeComponent implements OnInit/*, AfterViewInit*/ {
  // @ViewChild('container') containerRef!: ElementRef;

  showMsg : boolean = false;

  constructor (private route: ActivatedRoute, public servicioViajes : ViajesService, public servicioFotos : FotosService){

  }


  ngOnInit(){

    this.route.params.subscribe(params =>{

      // console.log(params['ciudad']);

      this.servicioViajes.cargarViaje(params);
      this.servicioFotos.cargarFotos(params);

    });

  }

  showTooltip(){

    this.showMsg = !this.showMsg;
    // console.log(this.showMsg);
  }

  // ngAfterViewInit() {
  //   this.containerRef.nativeElement.scrollTo(0, 0);
  // }



}
