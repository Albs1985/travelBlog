import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-mision-cumplida',
  templateUrl: './mision-cumplida.component.html',
  styleUrls: ['./mision-cumplida.component.css']
})
export class MisionCumplidaComponent implements OnInit {
  dificultad: number = 4;
  misiones: string[] = [];
  cartasNumeradas: string[] = [];
  cartasJugador: string[] = [];
  cartasEnMesa: string[] = [];
  mazoMisiones: string[] = [];
  mazoNumeros: string[] = [];

  cartaJugadorSeleccionada: string = '';
  indexCartaJugadorSelec: number = -1;
  indexCartaMesaSelec: number = -1;
  indexMisionCumplida: number[] = [];
  // cartaMesaSeleccionada: string = '';
  // jugadorActual: number = 0;
  motivoFinPartida: string = '';
  finPartida: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {  }

  ngOnInit(){
    this.prepararPartida();
  }

  prepararPartida(): void {
    // Preparación de las cartas de misión y cartas numeradas

    this.prepararMisiones();
    this.prepararCartasNumeradas();

    // Repartir 4 cartas al jugador
    this.repartirCartas();

    // Colocar las primeras 4 cartas numeradas en la mesa
    this.colocarCartasEnMesa(4);

    // Preparar mazo de misiones y colocar las primeras cartas de misión
    this.prepararMazoMisiones();
  }


  repartirCartas(): void {
    this.cartasJugador = this.cartasNumeradas.splice(0, 4);
  }

  colocarCartasEnMesa(cantidad: number): void {
    for (let i = 0; i < cantidad; i++) {
      this.cartasEnMesa.push(this.cartasNumeradas.shift()!);
    }
  }

  prepararMazoMisiones(): void {
    this.mazoMisiones = this.misiones.slice(0,this.dificultad);
    this.mazoMisiones.sort(() => Math.random() - 0.5);
  }

  seleccionaCartaJugador(carta: string, index: number){
    this.indexCartaJugadorSelec = index;
    this.cartaJugadorSeleccionada=carta;
  }

  seleccionaCartaEnMesa(carta: string, indiceACambiar: number){
    this.indexCartaMesaSelec = indiceACambiar;
    if (this.cartaJugadorSeleccionada !== '' && indiceACambiar >= 0 && indiceACambiar < this.cartasEnMesa.length){
      this.cartasEnMesa = this.cartasEnMesa.map((valor, indice) => {
        if (indice === indiceACambiar) {
          return this.cartaJugadorSeleccionada;
        } else {
          return valor;
        }
      });

      //Eliminamos la carta del jugador
      const indice = this.cartasJugador.indexOf(this.cartaJugadorSeleccionada);
      if (indice !== -1) { // Verificamos si el valor existe en el array
        this.cartasJugador.splice(indice, 1); // Eliminamos el valor del array
      }

      this.cartaJugadorSeleccionada = '';

      this.comprobarMisiones();
      this.robarCarta();
    }

    setTimeout(()=>{
      this.indexCartaMesaSelec = -1;
      this.indexCartaJugadorSelec = -1;
    }, 2000);


  }

  robarCarta(): void {
    // Lógica para robar una carta del mazo
    setTimeout(()=>{
      if (this.cartasNumeradas.length > 0){
        this.cartasJugador.push(this.cartasNumeradas[0]);
        this.cartasNumeradas.splice(0, 1); // Eliminamos la primera carta del array
      }else{
        this.motivoFinPartida = '¡Se terminaron las cartas! ¡Has perdido!'
        this.finPartida.next(true);
        console.log(this.motivoFinPartida);
      }
    }, 2000);


  }

  prepararCartasNumeradas(): void {
    const colores = ['rojo', 'azul', 'verde', 'amarillo']; // Definimos los colores disponibles
    const numeros = ['1', '2', '3', '4', '5', '6', '7']; // Definimos los números disponibles

    // Creamos las cartas numeradas para cada color y número
    for (let color of colores) {
      for (let numero of numeros) {
        // Añadimos dos cartas de cada número al mazo
        this.cartasNumeradas.push(`${color}-${numero}`);
        this.cartasNumeradas.push(`${color}-${numero}`);
      }
    }

    // Mezclamos las cartas numeradas
    this.cartasNumeradas.sort(() => Math.random() - 0.5);
    console.log(this.cartasNumeradas.length)
  }

  comprobarMisiones(): boolean {
    // Lógica para comprobar si se han completado misiones
    // let indexMisionCumplida = [];

    // console.log(this.cartasEnMesa[0].substring(this.cartasEnMesa[0].length-1, this.cartasEnMesa[0].length))
    for (let i = 0; i < this.mazoMisiones.length; i++) {
      const mision = this.mazoMisiones[i];

      switch(mision){
        case "Ningún número repetido":
          console.log("Ningún número repetido")
          if (
            (this.cartasEnMesa[0].substring(this.cartasEnMesa[0].length-1, this.cartasEnMesa[0].length) !=
              this.cartasEnMesa[1].substring(this.cartasEnMesa[1].length-1, this.cartasEnMesa[1].length) &&
              this.cartasEnMesa[0].substring(this.cartasEnMesa[0].length-1, this.cartasEnMesa[0].length) !=
              this.cartasEnMesa[2].substring(this.cartasEnMesa[2].length-1, this.cartasEnMesa[2].length) &&
              this.cartasEnMesa[0].substring(this.cartasEnMesa[0].length-1, this.cartasEnMesa[0].length) !=
              this.cartasEnMesa[3].substring(this.cartasEnMesa[3].length-1, this.cartasEnMesa[3].length) &&
              this.cartasEnMesa[1].substring(this.cartasEnMesa[1].length-1, this.cartasEnMesa[1].length) !=
              this.cartasEnMesa[2].substring(this.cartasEnMesa[2].length-1, this.cartasEnMesa[2].length) &&
              this.cartasEnMesa[1].substring(this.cartasEnMesa[1].length-1, this.cartasEnMesa[1].length) !=
              this.cartasEnMesa[3].substring(this.cartasEnMesa[3].length-1, this.cartasEnMesa[3].length) &&
              this.cartasEnMesa[2].substring(this.cartasEnMesa[2].length-1, this.cartasEnMesa[2].length) !=
              this.cartasEnMesa[3].substring(this.cartasEnMesa[3].length-1, this.cartasEnMesa[3].length))
          ){
              this.indexMisionCumplida.push(i);
          }
        break;
        case "Todos del mismo color":
          if (this.cartasEnMesa[0].substring(0, this.cartasEnMesa[0].length-2) ==
          this.cartasEnMesa[1].substring(0, this.cartasEnMesa[1].length-2) &&
          this.cartasEnMesa[1].substring(0, this.cartasEnMesa[1].length-2) ==
            this.cartasEnMesa[2].substring(0, this.cartasEnMesa[2].length-2) &&
            this.cartasEnMesa[2].substring(0, this.cartasEnMesa[2].length-2) ==
            this.cartasEnMesa[3].substring(0, this.cartasEnMesa[3].length-2)) {
              this.indexMisionCumplida.push(i);
          }
        break;
        case "Una secuencia ascendente o descendente":
        break;
        case "Dos números pares y dos impares":
        break;
      }
    }



    return true;
  }

  prepararMisiones(): void {
    // Definimos las misiones posibles
    const misiones = [
      "Ningún número repetido",
      "Todos del mismo color",
      "Una secuencia ascendente o descendente",
      "Dos números pares y dos impares",
      "Dos cartas rojas y dos azules",
      "Suma de números igual a 20",
      "Una carta de cada color",
      "Cuatro cartas consecutivas del mismo color",
      "Suma de números igual a 15",
      "Tres números pares",
      "Tres cartas rojas y una azul",
      "Tres cartas azules y una roja",
      "Dos números repetidos y dos distintos",
      "Todas las cartas del mismo número",
      "Dos números primos y dos no primos",
      "Todas las cartas del mismo palo",
      "Cuatro números impares",
      "Cuatro números pares",
      "Dos números consecutivos y dos no consecutivos",
      "Tres números ascendentes y uno descendente",
      "Una carta roja, una azul, una verde y una amarilla",
      "Cuatro cartas de palos diferentes",
      "Cuatro cartas del mismo palo",
      "Todas las cartas en orden ascendente",
      "Todas las cartas en orden descendente",
      "Cuatro números diferentes",
      "Dos números primos y dos no primos",
      "Todas las cartas del mismo número",
      "Cuatro números consecutivos",
      "Dos números impares y dos pares",
      "Dos números ascendentes y dos descendentes",
      "Dos números idénticos y dos diferentes",
      "Dos números consecutivos y dos no consecutivos",
      "Todas las cartas en orden ascendente",
      "Todas las cartas en orden descendente",
      "Cuatro cartas del mismo color",
      "Todas las cartas de distinto color",
      "Dos cartas del mismo color y dos diferentes",
      "Dos números pares y dos impares",
      "Una secuencia ascendente de cuatro cartas",
      "Una secuencia descendente de cuatro cartas",
      "Dos números rojos y dos negros",
      "Dos números impares y dos pares",
      "Tres cartas de palos rojos y una negra",
      "Tres cartas de palos negros y una roja",
      "Una carta de cada color",
      "Dos cartas rojas y dos negras",
      "Todas las cartas del mismo palo",
      "Todas las cartas de distinto palo",
      "Una carta roja, una azul, una verde y una amarilla",
      "Cuatro cartas de palos diferentes",
      "Cuatro cartas del mismo palo"
    ];

    // Agregamos las misiones al array misiones
    this.misiones.push(...misiones);
    //TODO: para que sean aleatorias las misiones this.misiones.sort(() => Math.random() - 0.5);
  }

}
