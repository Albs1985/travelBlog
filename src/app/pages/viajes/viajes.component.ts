import { Component, OnInit } from '@angular/core';
import { ViajesService } from '../../services/viajes.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { Viajes } from 'src/app/interfaces/viajes.interface';

@Component({
  selector: 'app-viajes',
  templateUrl: './viajes.component.html',
  styleUrls: ['./viajes.component.css']
})
export class ViajesComponent{
  // implements OnInit

  orderDesc : boolean;
  ejecutarSoloTouch: boolean;
  viajesListado : Viajes[] = [];

  constructor(public servicioViajes : ViajesService,
    private route: ActivatedRoute,
    private translate: TranslateService){

      // this.preloadImages();
      this.orderDesc = true;
      this.ejecutarSoloTouch = false;
      this.servicioViajes.cargarViajes();
  }
  // ngOnInit(): void {
  //   // Pre cargar imágenes
  //   // this.preloadImages();
  // }

  // preloadImages(): void {
  //   const imagesToPreload: string[] = [
  //     'assets/images/2019/Portada2019.jpg',
  //     'assets/images/2020/Portada2020.jpg',
  //     'assets/images/2021/Portada2021.jpg',
  //     'assets/images/2022/Portada2022.jpg',
  //     'assets/images/2023/Portada2023.jpg',
  //     'assets/images/2024/Portada2024.jpg'
  //   ];

  //   imagesToPreload.forEach(imageUrl => {
  //     const img = new Image();
  //     img.src = imageUrl;
  //   });
  // }

  public ordenar(eventType: string): void {

    // console.log('eventType - '+eventType);
    if (eventType === 'click' && !this.ejecutarSoloTouch) {
      this.servicioViajes.viajesLista.reverse();
    } else if (eventType === 'touchstart') {
      this.ejecutarSoloTouch = true;
      this.servicioViajes.viajesLista.reverse();
    }
    this.orderDesc = !this.orderDesc;
  }
}
