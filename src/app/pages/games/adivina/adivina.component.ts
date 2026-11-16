import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { CommonService } from 'src/app/services/common.service';
import { ViajerosService } from 'src/app/services/viajeros.service';
import { ViajesService } from 'src/app/services/viajes.service';

@Component({
  selector: 'app-adivina',
  templateUrl: './adivina.component.html',
  styleUrls: ['./adivina.component.css']
})
export class AdivinaComponent implements OnInit, OnDestroy{
  pieces: boolean[] = [];
  turnCount: number = 0;
  blurAmount: number = 30; // Cantidad de desenfoque inicial
  numMaxTurnos: number = 30;
  blurFilter: string = ''; // Valor del filtro CSS
  urlImagen: string = '';
  finDelJuego = new BehaviorSubject(false);
  inicioDelJuego = new BehaviorSubject(true);
  nomViaje : string = '';
  showNomViaje = new BehaviorSubject(false);

  constructor(public commonService: CommonService, public viajesService : ViajesService) {
    this.commonService.modoJuegos$.next(true);

  }
  ngOnDestroy(): void {
    this.commonService.modoJuegos$.next(false);
  }

  ngOnInit(): void {
    this.viajesService.viajes$.pipe(take(1)).subscribe((viajes) => {
      const conFotos = viajes.filter((v) => v.fotos.length > 0);
      if (conFotos.length > 0){
        const viaje = conFotos[Math.floor(Math.random() * conFotos.length)];
        const foto = viaje.fotos[Math.floor(Math.random() * viaje.fotos.length)];
        this.urlImagen = 'assets/images/' + foto;
        this.nomViaje = viaje.destino;
      }
    });
    this.blurFilter = `blur(${this.blurAmount}px)`;

  }

  comprobar(){
    this.showNomViaje.next(true);
    this.blurAmount = 0;
    this.blurFilter = `blur(${this.blurAmount}px)`;
    setTimeout(()=>{
      if (this.turnCount != this.numMaxTurnos/2){
        this.finDelJuego.next(true);
      }
    }, 2000);
  }

  revealImage() {
    if (this.blurAmount > 0) {
      this.blurAmount -= 2; // Reduce la cantidad de desenfoque en cada clic
      this.blurFilter = `blur(${this.blurAmount}px)`; // Actualiza el filtro CSS
      this.turnCount++;
      if (this.turnCount === this.numMaxTurnos/2){
        setTimeout(()=>{
          this.finDelJuego.next(true);
        }, 2000);
      }
    }
  }

  restartGame(){
    this.showNomViaje.next(false);
    this.finDelJuego.next(false);
    this.turnCount = 0;
    this.blurAmount = 30;
    this.ngOnInit();
  }

  close(){
    this.finDelJuego.next(false);
  }
}
