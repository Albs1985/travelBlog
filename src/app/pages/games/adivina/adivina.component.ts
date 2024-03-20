import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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
    this.viajesService.cargarViajesTotales().then(()=>{
      if (this.viajesService.viajesTotales && this.viajesService.viajesTotales.length > 0){
        let index = Math.floor(Math.random() * (this.viajesService.viajesTotales.length - 1 + 1) + 1);
        let indexNumFotos = Math.floor(Math.random() * (this.viajesService.viajesTotales[index].numFotos - 1 + 1) + 1);
        this.urlImagen = 'assets/images/'+this.viajesService.viajesTotales[index].year +'/'+this.viajesService.viajesTotales[index].identificadorFotos+''+indexNumFotos+'.jpg';
        this.nomViaje = this.viajesService.viajesTotales[index].destino;
      }
    });

    this.blurFilter = `blur(${this.blurAmount}px)`;

  }

  comprobar(){
    this.showNomViaje.next(true);
    this.blurAmount = 0;
    this.blurFilter = `blur(${this.blurAmount}px)`;
    setTimeout(()=>{
      this.finDelJuego.next(true);
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
