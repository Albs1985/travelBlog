// quien-es-quien.component.ts
import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ViajesService } from 'src/app/services/viajes.service';

interface Personaje {
  nombre: string;
  imagen: string;
  descartado: boolean;
}

@Component({
  selector: 'app-quien-es-quien',
  templateUrl: './quien-es-quien.component.html',
  styleUrls: ['./quien-es-quien.component.css']
})


export class QuienEsQuienComponent implements OnInit{

  personajes: Personaje[] = [];
  adversaryPersonaje: Personaje | null = null;
  inicioDelJuego = new BehaviorSubject(false);
  finDelJuego = new BehaviorSubject(false);
  numTurno: number = 0;

  constructor(public viajesService : ViajesService){
    this.adversaryPersonaje = {
      nombre : '',
      imagen: '',
      descartado: false
    };
  }

  ngOnInit(): void {
    this.viajesService.cargarViajesTotales().then(()=>{
      if (this.viajesService.viajesTotales && this.viajesService.viajesTotales.length > 0){
        this.viajesService.viajesTotales.forEach((viaje)=>{
          viaje.personas.forEach((persona)=>{
            let perso = {
              nombre : persona,
              imagen: 'assets/images/perfiles/fotoPerfil'+persona+'.jpg',
              descartado: false
            };
            if (!this.personajes.find(x => x.nombre === perso.nombre)){
              this.personajes.push(perso);
            }
          });
        });

        this.shufflePersonajes();
        this.selectAdversaryCharacter();
      }
    });
  }

  shufflePersonajes(): void {
    for (let i = this.personajes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.personajes[i], this.personajes[j]] = [this.personajes[j], this.personajes[i]];
    }
  }

  incrementTurn(){
    this.numTurno++;
  }

  restartGame(){
    this.numTurno = 0;
    this.personajes = [];
    this.adversaryPersonaje = null;
    this.inicioDelJuego.next(false);
    this.finDelJuego.next(false);
    this.ngOnInit();
  }

  // Método para seleccionar aleatoriamente un personaje para que lo adivine el adversario
  selectAdversaryCharacter(): void {
    const randomIndex = Math.floor(Math.random() * this.personajes.length);
    this.adversaryPersonaje = this.personajes[randomIndex];
    this.inicioDelJuego.next(true);
    console.log(this.adversaryPersonaje)
  }

  markAsDiscarded(personaje?: Personaje): void {
    this.personajes.forEach((pers)=>{
      if (pers === personaje){
        pers.descartado = true;
        let indexToUpdate = this.personajes.findIndex(personaje => personaje.nombre === pers.nombre);
        this.personajes[indexToUpdate] = pers;
        this.personajes = Object.assign([], this.personajes);
      }
      this.checkAllDiscarded();
    });
  }

  checkAllDiscarded(): void {
    let allDiscarded = true;
    this.personajes.forEach((pers)=>{
      if (!pers.descartado){
        allDiscarded = false;
        return;
      }
    });
    if (allDiscarded) {
      this.finDelJuego.next(true); // Emite el evento finDelJuego si todos los personajes están descartados
    }
  }
}
