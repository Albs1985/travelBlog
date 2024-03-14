// memory-game.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, max } from 'rxjs';
import { Viajero } from 'src/app/interfaces/viajero.interface';
import { CommonService } from 'src/app/services/common.service';
import { ViajerosService } from 'src/app/services/viajeros.service';
import { ViajesService } from 'src/app/services/viajes.service';

interface MemoryCard {
  image: string;
  isFlipped: boolean;
  isMatched: boolean;
  player?: string;
}

@Component({
  selector: 'app-memory',
  templateUrl: './memory.component.html',
  styleUrls: ['./memory.component.css']
})
export class MemoryComponent implements OnInit, OnDestroy {

  level: number = 0;
  cards: MemoryCard[] = [];
  difficulty: string = 'facil';
  numFotosJuegoSeleccionado : number = 0;
  fotosJuegoSeleccionado : string = '';
  marinaScore: number = 0;
  mateuScore: number = 0;
  albaScore: number = 0;
  albertScore: number = 0;
  winnerPlayer : string = '';
  selectedPlayer: string | null = null;
  currentIndex: number = 0;
  jugadoresSeleccionados: Viajero[] = [];
  jugadoresDisponibles: Viajero[] = [];

  finDelJuego = new BehaviorSubject(true);
  jugadorInicialNoSeleccionado = new BehaviorSubject(true);
  inicioDelJuego = new BehaviorSubject(false);


  constructor(public commonService: CommonService, public servicioJugadores: ViajerosService, public viajesService : ViajesService) {
    this.commonService.modoJuegos$.next(true);
  }

  ngOnDestroy(): void {
    this.commonService.modoJuegos$.next(false);
  }

  ngOnInit(): void {
    this.viajesService.cargarViajesTotales().then(()=>{
      if (this.viajesService.viajesTotales && this.viajesService.viajesTotales.length > 0){
        this.fotosJuegoSeleccionado = this.viajesService.viajesTotales[0].year+'/'+this.viajesService.viajesTotales[0].identificadorFotos;
        this.numFotosJuegoSeleccionado = this.viajesService.viajesTotales[0].numFotos;
      }
    });
    this.servicioJugadores.cargarViajeros().then(()=>{
      this.jugadoresDisponibles = this.servicioJugadores.viajerosLista.filter(jugador => this.jugadoresSeleccionados.includes(jugador));
    });
    this.generateCards();
  }

  startGame(){
    if (!this.selectedPlayer){
      this.jugadorInicialNoSeleccionado.next(true);
    }else{
      this.jugadorInicialNoSeleccionado.next(false);
      this.inicioDelJuego.next(true);
      this.restartGame();
    }
  }

  restartGame(){
    // this.selectedPlayer = null;
    this.marinaScore = 0;
    this.mateuScore = 0;
    this.albaScore = 0;
    this.albertScore = 0;
    this.winnerPlayer = '';
    this.currentIndex = 0;
    this.generateCards();
  }

  onDifficultyChange(): void {
    this.restartGame();
  }

  onSelectImagesGameChange(): void {
    this.viajesService.viajesTotales.forEach((viaje)=>{
      if (viaje.year+'/'+viaje.identificadorFotos === this.fotosJuegoSeleccionado){
        this.numFotosJuegoSeleccionado = viaje.numFotos;
      }
    });
    this.restartGame();
  }

  seleccionarJugador(nombre: string): void {
    this.selectedPlayer = nombre === this.selectedPlayer ? null : nombre;
    for (const [index, player] of this.jugadoresSeleccionados.entries()) {
      if (this.selectedPlayer === player.nombreCorto){
        this.currentIndex = index;
      }
    }
  }

  avanzarJugador(): void {
    this.currentIndex = (this.currentIndex + 1) % this.jugadoresSeleccionados.length;
    this.selectedPlayer = this.jugadoresSeleccionados[this.currentIndex].nombreCorto;
  }

  togglePlayerSelection(jugador: Viajero): void {
    if (this.isPlayerSelected(jugador)) {
      this.jugadoresSeleccionados = this.jugadoresSeleccionados.filter(item => item !== jugador);
    } else {
      this.jugadoresSeleccionados.push(jugador);
    }
  }

  isPlayerSelected(jugador: Viajero): boolean {
    return this.jugadoresSeleccionados.includes(jugador);
  }

  generateCards(): void {
    this.finDelJuego.next(false);
    this.cards = [];

    switch(this.difficulty){
      case 'facil':
        if (Math.round(Math.abs(this.numFotosJuegoSeleccionado/2/2/2)) <=1){
          this.level = 2;
        }else{
          this.level = Math.round(Math.abs(this.numFotosJuegoSeleccionado/2/2/2));
        }
        break;
      case 'medio':
        this.level = Math.round(Math.abs(this.numFotosJuegoSeleccionado/2/2));
        break;
      case 'dificil':
        this.level = Math.round(Math.abs(this.numFotosJuegoSeleccionado/2));
        break;
      case 'loco':
        this.level = this.numFotosJuegoSeleccionado;
        break;
    }
    for (let i = 1; i <= this.level; i++) {
      this.cards.push({ image: 'assets/images/'+this.fotosJuegoSeleccionado+''+i+'.jpg', isFlipped: false, isMatched: false });
      this.cards.push({ image: 'assets/images/'+this.fotosJuegoSeleccionado+''+i+'.jpg', isFlipped: false, isMatched: false });
    }
    this.shuffleCards();

  }

  flipCard(card: MemoryCard): void {
    if (!card.isFlipped && !card.isMatched) {
      card.isFlipped = true;
      const flippedCards = this.cards.filter(c => c.isFlipped && !c.isMatched);
      if (flippedCards.length === 2) {
        this.checkForMatch(flippedCards);
      }
    }
  }

  checkForMatch(flippedCards: MemoryCard[]): void {
    let hayQueAvanzarJugador;
    if (flippedCards[0].image === flippedCards[1].image) {
      hayQueAvanzarJugador = false;
      flippedCards.forEach(card => {
        card.isMatched = true;
        card.player = this.selectedPlayer ?? 'defaultPlayerName';
        if (this.selectedPlayer === 'Marina') {
          this.marinaScore++;
        }
        if (this.selectedPlayer === 'Mateu') {
          this.mateuScore++;
        }
        if (this.selectedPlayer === 'Alba') {
          this.albaScore++;
        }
        if (this.selectedPlayer === 'Albert') {
          this.albertScore++;
        }
        return;
      });
    } else {
      hayQueAvanzarJugador = true;
      setTimeout(() => {
        flippedCards.forEach(card => card.isFlipped = false);
      }, 1000);
    }

    if (!this.areAllCardsFlipped()){
      if (hayQueAvanzarJugador){
        setTimeout(() => {
          this.avanzarJugador();
        }, 1000);
      }
    }else{
      this.calculaWinner();
      this.finDelJuego.next(true);
    }

  }

  calculaWinner(){
    const maxNumber = Math.max(this.marinaScore, this.mateuScore, this.albaScore, this.albertScore);
    if (this.marinaScore === maxNumber){
      this.winnerPlayer = this.winnerPlayer + 'Marina';
    }
    if (this.mateuScore === maxNumber){
      if (this.winnerPlayer!== '') this.winnerPlayer = this.winnerPlayer+' / ';
      this.winnerPlayer = this.winnerPlayer +'Mateu';
    }
    if (this.albaScore === maxNumber){
      if (this.winnerPlayer!== '') this.winnerPlayer = this.winnerPlayer+' / ';
      this.winnerPlayer = this.winnerPlayer +'Alba';
    }
    if (this.albertScore === maxNumber){
      if (this.winnerPlayer!== '') this.winnerPlayer = this.winnerPlayer+' / ';
      this.winnerPlayer = this.winnerPlayer +'Albert';
    }
  }

  shuffleCards(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  areAllCardsFlipped(): boolean {
    return this.cards.every(card => card.isFlipped);
  }

}
