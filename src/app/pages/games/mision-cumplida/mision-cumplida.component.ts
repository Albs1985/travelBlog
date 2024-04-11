import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';
import { Viajero } from 'src/app/interfaces/viajero.interface';
import { CommonService } from 'src/app/services/common.service';
import { ViajerosService } from 'src/app/services/viajeros.service';

@Component({
  selector: 'app-mision-cumplida',
  templateUrl: './mision-cumplida.component.html',
  styleUrls: ['./mision-cumplida.component.css']
})
export class MisionCumplidaComponent implements OnInit {

  dificultad: number = 0;
  dificultades: string[] = ['Fácil (6 misiones)', 'Medio (12 misiones)','Difícil (18 misiones)','¡De locos! (24 misiones)'];
  misiones: string[] = [];
  cartasNumeradas: string[] = [];
  cartasJugadorActivo: string[] = [];
  cartasEnMesa: string[] = [];
  mazoMisiones: string[] = [];
  mazoMisionesAMostrar: string[] = [];
  mazoMisionesCompletadas: string[] = [];
  mazoNumeros: string[] = [];
  // contadorMisionesCompletadas: number = 0;

  cartaJugadorSeleccionada: string = '';
  indexCartaJugadorSelec: number = -1;
  indexCartaMesaSelec: number = -1;
  indexMisionCumplida: number[] = [];



  //Multiplayer
  jugadoresDisponibles: Viajero[] = [];
  jugadoresSeleccionados: Viajero[] = [];
  selectedPlayer: string | null = null;
  currentIndexPlayer: number = -1;
  cartasJugadores: Map<number, string[]> = new Map<number, string[]>();
  jugadorInicialNoSeleccionado = new BehaviorSubject(true);

  numerosTemporizador: number[] = [];
  // crono: number = 5;


  motivoFinPartida: string = '';
  // inicioPartida: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  finPartida: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  robaCarta: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  robaCartaMision: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  ocultarCartas: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  mostrarInfo: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  noPuedeJugarCarta: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(public commonService: CommonService, public servicioJugadores: ViajerosService) {  }

  ngOnInit(){
    this.commonService.modoJuegos$.next(true);

    this.servicioJugadores.cargarViajeros().then(()=>{
      this.jugadoresDisponibles = this.servicioJugadores.viajerosLista.filter(jugador => this.jugadoresSeleccionados.includes(jugador));
    });

  }

  ngOnDestroy(): void {
    this.commonService.modoJuegos$.next(false);
  }

  mostrarTooltip(){
    this.mostrarInfo.next(!this.mostrarInfo.value);
  }

  startGame(){
    if (this.currentIndexPlayer == -1){
      this.jugadorInicialNoSeleccionado.next(true);
    }else{
      this.finPartida.next(false);
      // this.inicioPartida.next(true);
      this.prepararPartida();
    }
  }

  restartGame(){
    this.resetData();
    this.startGame();
  }

  resetData(){
    this.misiones = [];
    this.cartasNumeradas = [];
    this.cartasJugadorActivo = [];
    this.cartasEnMesa = [];
    this.mazoMisiones = [];
    this.mazoNumeros = [];
    this.mazoMisionesAMostrar = [];
    this.mazoMisionesCompletadas = [];
    // this.contadorMisionesCompletadas = 0;
    this.dificultad = 0;

    this.cartaJugadorSeleccionada = '';
    this.indexCartaJugadorSelec = -1;
    this.indexCartaMesaSelec = -1;
    this.indexMisionCumplida = [];
    this.motivoFinPartida = '';

    this.jugadoresDisponibles = [];
    this.jugadoresSeleccionados = [];
    this.selectedPlayer = null;
    this.currentIndexPlayer = -1;
    this.jugadorInicialNoSeleccionado.next(true);
    this.finPartida.next(false);
    this.robaCarta.next(false);
    this.robaCartaMision.next(false);
    this.ocultarCartas.next(false);
    this.mostrarInfo.next(false);

    this.cartasJugadores.clear();
  }



  prepararPartida(): void {
    this.prepararMisiones();
    this.prepararCartasNumeradas();
    this.repartirCartas();
    this.prepararMazoMisiones(4);
    this.colocarCartasEnMesa(4);
  }

  repartirCartas(): void {

    for (let i=0; i < this.jugadoresSeleccionados.length; i++){
      this.cartasJugadores.set(i, this.cartasNumeradas.splice(0, 4));
    }
    if (this.jugadoresSeleccionados.length!=0){
      this.cartasJugadorActivo = this.cartasJugadores.get(this.currentIndexPlayer)!;
    }else{
      this.jugadorInicialNoSeleccionado.next(true);
    }

  }

  colocarCartasEnMesa(cantidad: number): void {
    for (let i = 0; i < cantidad; i++) {
      this.cartasEnMesa.push(this.cartasNumeradas.shift()!);
    }
    setTimeout(()=>{
      // console.log('colocarCartasEnMesa comprobarMisiones');
      this.comprobarMisiones();
    }, 2000);
  }

  prepararMazoMisiones(numCartasMazo: number): void {
    this.mazoMisiones = this.misiones.slice(0,this.dificultad);
    this.mazoMisiones.sort(() => Math.random() - 0.5);
    for (let i=0; i < numCartasMazo; i++){
      this.mazoMisionesAMostrar.push(this.mazoMisiones.shift()!);
    }

  }

  seleccionaCartaJugador(carta: string, index: number){
    this.indexCartaJugadorSelec = index;
    this.cartaJugadorSeleccionada=carta;
  }

  seleccionarDificultad(event: Event){
    const dificultadSelec = (event.target as HTMLSelectElement).value;
    if (dificultadSelec.includes('6')){
      this.dificultad = 6;
    }else if (dificultadSelec.includes('12')){
      this.dificultad = 12;
    }else if (dificultadSelec.includes('18')){
      this.dificultad = 18;
    }else if (dificultadSelec.includes('24')){
      this.dificultad = 24;
    }
    this.startGame();
  }

  pasaTurno(){
    this.ocultarCartasJugador();
    this.iniciarTemporizador();
    setTimeout(()=>{
      this.currentIndexPlayer = (this.currentIndexPlayer + 1) % this.jugadoresSeleccionados.length;
      this.selectedPlayer = this.jugadoresSeleccionados[this.currentIndexPlayer].nombreCorto;
      this.cartasJugadorActivo = this.cartasJugadores.get(this.currentIndexPlayer)!;
      this.mostrarCartasJugador();
    }, 5500);
  }

  iniciarTemporizador() {
    let segundosRestantes = 5;
    this.numerosTemporizador = [];
    let intervalSubscription = interval(1000).subscribe(() => {
      this.numerosTemporizador.push(segundosRestantes);
      segundosRestantes--;
      if (segundosRestantes === 0){
        intervalSubscription.unsubscribe();
      }
    });

  }

  // Método para ocultar las cartas
  ocultarCartasJugador() {
    this.ocultarCartas.next(true);
  }

  // Método para mostrar las cartas
  mostrarCartasJugador() {
    this.ocultarCartas.next(false);
  }

  togglePlayerSelection(jugador: Viajero): void {

    if (this.isPlayerSelected(jugador)) {
      this.jugadoresSeleccionados = this.jugadoresSeleccionados.filter(item => item !== jugador);
      if (this.selectedPlayer === jugador.nombreCorto){
        if (this.jugadoresSeleccionados.length > 0){
          this.selectedPlayer = this.jugadoresSeleccionados[0].nombreCorto;
        }else{
          this.selectedPlayer = null;
        }
      }
    } else {
      this.jugadoresSeleccionados.push(jugador);
    }
  }

  isPlayerSelected(jugador: Viajero): boolean {
    return this.jugadoresSeleccionados.includes(jugador);
  }

  seleccionarJugador(nombre: string): void {

    if (this.selectedPlayer== null){
      this.selectedPlayer = nombre === this.selectedPlayer ? null : nombre;
      for (const [index, player] of this.jugadoresSeleccionados.entries()) {
        if (this.selectedPlayer === player.nombreCorto){
          this.currentIndexPlayer = index;
          this.jugadorInicialNoSeleccionado.next(false);
        }
      }
    }

  }

  obtenerColorCarta(carta: string): string {
    if (carta.includes('rojo')) {
      return 'rgb(228,3,33)';
    } else if (carta.includes('azul')) {
      return 'rgb(0,172,234)';
    } else if (carta.includes('amarillo')) {
      return 'rgb(249,155,0)';
    } else if (carta.includes('verde')) {
      return 'rgb(7,164,121)';
    } else {
      return 'rgb(255, 228, 177);'; // Color por defecto o el que prefieras
    }
  }

  obtenerGradienteColorCarta(carta: string): string {
    if (carta.includes('rojo')) {
      return 'rgba(180,3,33, 0.2)';
    } else if (carta.includes('azul')) {
      return 'rgba(0,172,200, 0.2)';
    } else if (carta.includes('amarillo')) {
      return 'rgba(190,155,0, 0.2)';
    } else if (carta.includes('verde')) {
      return 'rgba(7,120,121, 0.2)';
    } else {
      return 'rgba(255, 228, 177, 0.2);'; // Color por defecto o el que prefieras
    }
  }

  //Revisamos si el jugador puede hacer ese movimiento: solo se permite cambiar una carta por otra cuando son del mismo color o del mismo número:
  puedeJugarCarta(indiceCambiar: number): boolean{
    let juegaCarta = false;
    const indiceEncontrado = this.cartasEnMesa.findIndex((valor, indice) => {
      return ((this.cartaJugadorSeleccionada.includes(valor.substring(valor.length-1, valor.length)) ||
              this.cartaJugadorSeleccionada.includes(valor.substring(0, valor.length-2))) &&
              indice === indiceCambiar);
    });

    if (indiceEncontrado !== -1) {
      juegaCarta = true;
    }

    return juegaCarta;

  }

  noPuedeJugarNingunaCarta(): boolean {
    for (let i = 0; i < this.cartasJugadorActivo.length; i++) {
        const cartaJugador = this.cartasJugadorActivo[i];
        const indiceEncontrado = this.cartasEnMesa.findIndex((cartaMesa) => {
            return cartaJugador.includes(cartaMesa.substring(cartaMesa.length - 1)) ||
                   cartaJugador.includes(cartaMesa.substring(0, cartaMesa.length - 2));
        });
        if (indiceEncontrado !== -1) {
            return false; // Si puede jugar al menos una carta, retorna falso
        }
    }
    return true; // Si no puede jugar ninguna carta, retorna verdadero
  }

  seleccionaCartaEnMesa(indiceACambiar: number){

    if (this.cartaJugadorSeleccionada !== '' && indiceACambiar >= 0 && indiceACambiar < this.cartasEnMesa.length){
      if (this.puedeJugarCarta(indiceACambiar)){

        this.cartasEnMesa = this.cartasEnMesa.map((valor, indice) => {
          if (indice === indiceACambiar) {
            return this.cartaJugadorSeleccionada;
          } else {
            return valor;
          }
        });


        //Eliminamos la carta del jugador
        const indice = this.cartasJugadorActivo.indexOf(this.cartaJugadorSeleccionada);
        if (indice !== -1) { // Verificamos si el valor existe en el array
          this.cartasJugadorActivo.splice(indice, 1); // Eliminamos el valor del array
        }

        this.cartaJugadorSeleccionada = '';

        //Si no se ha terminado la partida, robamos una carta
        if (this.finPartida.value === false){
          this.robarCarta();
        }

      }else{
        //No se puede jugar la carta
        this.indexCartaMesaSelec = indiceACambiar;
        this.noPuedeJugarCarta.next(true);
        setTimeout(()=>{
          this.indexCartaMesaSelec = -1;
          this.noPuedeJugarCarta.next(false);
        }, 2000);
      }
    }

  }

  robarCarta(): void {
    // Lógica para robar una carta del mazo

    this.indexCartaJugadorSelec = -1;
    this.indexCartaMesaSelec = -1;

    setTimeout(()=>{
      this.robaCarta.next(true);
    }, 1500);

    setTimeout(()=>{
      this.robaCarta.next(true);
      if (this.cartasNumeradas.length > 0){
        this.cartasJugadorActivo.push(this.cartasNumeradas[0]);
        this.cartasNumeradas.splice(0, 1); // Eliminamos la primera carta del array
      }else{
        this.motivoFinPartida = '¡Se terminaron las cartas! ¡Has perdido!'
        this.finPartida.next(true);
      }
      // console.log('robarCarta comprobarMisiones');
      this.comprobarMisiones();

      setTimeout(()=>{
        this.robaCarta.next(false);
        if (this.noPuedeJugarNingunaCarta()){
          this.motivoFinPartida = '¡No puedes hacer ningún movimiento! ¡Has perdido!'
          this.finPartida.next(true);
        }
      }, 2000);

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
  }






  /*MISIONES*/

  comprobarMisiones(): void {

    // Lógica para comprobar si se han completado misiones
    let numC1 = this.cartasEnMesa[0].substring(this.cartasEnMesa[0].length-1, this.cartasEnMesa[0].length);
    let numC2 = this.cartasEnMesa[1].substring(this.cartasEnMesa[1].length-1, this.cartasEnMesa[1].length);
    let numC3 = this.cartasEnMesa[2].substring(this.cartasEnMesa[2].length-1, this.cartasEnMesa[2].length);
    let numC4 = this.cartasEnMesa[3].substring(this.cartasEnMesa[3].length-1, this.cartasEnMesa[3].length);

    let colorC1 = this.cartasEnMesa[0].substring(0, this.cartasEnMesa[0].length-2);
    let colorC2 = this.cartasEnMesa[1].substring(0, this.cartasEnMesa[1].length-2);
    let colorC3 = this.cartasEnMesa[2].substring(0, this.cartasEnMesa[2].length-2);
    let colorC4 = this.cartasEnMesa[3].substring(0, this.cartasEnMesa[3].length-2);

    // console.log(numC1+' '+numC2+' '+numC3+' '+numC4+' '+colorC1+' '+colorC2+' '+colorC3+' '+colorC4);

    for (let i = 0; i < this.mazoMisionesAMostrar.length; i++) {
      const mision = this.mazoMisionesAMostrar[i];
      // console.log(mision);
      // console.log(i);
      switch(mision){
        case "Ningún número repetido":
          if (!this.indexMisionCumplida.includes(i)){
            if (numC1 != numC2 && numC1 != numC3 && numC1 != numC4 && numC2 != numC3 && numC2 != numC4 && numC3 != numC4){
                this.indexMisionCumplida.push(i);
            }
          }
        break;
        case "Todos del mismo color":
          if (!this.indexMisionCumplida.includes(i)){
            if (colorC1 == colorC2 && colorC2 == colorC3 && colorC3 == colorC4) {
                this.indexMisionCumplida.push(i);
            }
          }
        break;
        case "Una secuencia ascendente o descendente":
          if (!this.indexMisionCumplida.includes(i)){
            const numeros = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
            if (numeros[0] === numeros[1] - 1 && numeros[1] === numeros[2] - 1 && numeros[2] === numeros[3] - 1) {
              this.indexMisionCumplida.push(i);
            }
            else if (numeros[0] === numeros[1] + 1 && numeros[1] === numeros[2] + 1 && numeros[2] === numeros[3] + 1) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;
        case "Dos números pares y dos impares":
          if (!this.indexMisionCumplida.includes(i)){
            let pares = 0;
            let impares = 0;
            [numC1, numC2, numC3, numC4].forEach(num => {
              if (parseInt(num) % 2 === 0) {
                pares++;
              } else {
                impares++;
              }
            });
            if (pares === 2 && impares === 2) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;
        case "Dos cartas rojas y dos azules":
          if (!this.indexMisionCumplida.includes(i)) {
            const rojas = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'rojo').length;
            const azules = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'azul').length;
            if (rojas === 2 && azules === 2) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Suma de números igual a 20":
          if (!this.indexMisionCumplida.includes(i)) {
            const sumaNumeros = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].reduce((total, num) => total + num, 0);
            if (sumaNumeros === 20) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Suma de números igual a 12":
          if (!this.indexMisionCumplida.includes(i)) {
            const sumaNumeros = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].reduce((total, num) => total + num, 0);
            if (sumaNumeros === 12) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Cuatro cartas consecutivas del mismo color":
          if (!this.indexMisionCumplida.includes(i)) {
            const colores = [colorC1, colorC2, colorC3, colorC4];
            let consecutivas = false;
            for (let j = 0; j < colores.length - 3; j++) {
              if (colores[j] === colores[j + 1] && colores[j] === colores[j + 2] && colores[j] === colores[j + 3]) {
                consecutivas = true;
                break;
              }
            }
            if (consecutivas) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;
        case "Suma de números igual a 15":
          if (!this.indexMisionCumplida.includes(i)) {
            const sumaNumeros = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].reduce((total, num) => total + num, 0);
            if (sumaNumeros === 15) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Suma de números igual a 9":
          if (!this.indexMisionCumplida.includes(i)) {
            const sumaNumeros = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].reduce((total, num) => total + num, 0);
            if (sumaNumeros === 9) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Tres números pares":
          if (!this.indexMisionCumplida.includes(i)) {
            const pares = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].filter(num => num % 2 === 0).length;
            if (pares === 3) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Tres cartas rojas y una azul":
          if (!this.indexMisionCumplida.includes(i)) {
            const rojas = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'rojo').length;
            const azul = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'azul').length;
            if (rojas === 3 && azul === 1) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Tres cartas azules y una roja":
          if (!this.indexMisionCumplida.includes(i)) {
            const azules = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'azul').length;
            const roja = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'rojo').length;
            if (azules === 3 && roja === 1) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Dos números repetidos y dos distintos":
          if (!this.indexMisionCumplida.includes(i)) {
            const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
            const unicos = new Set(nums);
            if (unicos.size === 3) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Todas las cartas del mismo número":
          if (!this.indexMisionCumplida.includes(i)) {
            const numeros = [numC1, numC2, numC3, numC4];
            const unicos = new Set(numeros);
            if (unicos.size === 1) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Dos números primos y dos no primos":
          if (!this.indexMisionCumplida.includes(i)) {
            const primos = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].filter(num => {
              for (let j = 2; j <= Math.sqrt(num); j++) {
                if (num % j === 0) return false;
              }
              return num > 1;
            }).length;
            if (primos === 2) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Todas las cartas del mismo palo":
          if (!this.indexMisionCumplida.includes(i)) {
            const palos = [colorC1, colorC2, colorC3, colorC4];
            const unicos = new Set(palos);
            if (unicos.size === 1) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Cuatro números pares":
          if (!this.indexMisionCumplida.includes(i)) {
            const pares = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].filter(num => num % 2 === 0).length;
            if (pares === 4) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Cuatro números impares":
          if (!this.indexMisionCumplida.includes(i)) {
            const pares = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].filter(num => num % 2 != 0).length;
            if (pares === 4) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Tres números ascendentes y uno descendente":
          if (!this.indexMisionCumplida.includes(i)) {
              const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
              if (nums[0] < nums[1] && nums[1] < nums[2] && nums[2] > nums[3]){
                this.indexMisionCumplida.push(i);
              }
          }
          break;

        case "Cuatro cartas de palos diferentes":
          if (!this.indexMisionCumplida.includes(i)) {
            const palos = new Set([colorC1, colorC2, colorC3, colorC4]);
            if (palos.size === 4) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Cuatro cartas del mismo palo":
          if (!this.indexMisionCumplida.includes(i)) {
            const palos = [colorC1, colorC2, colorC3, colorC4];
            const unicos = new Set(palos);
            if (unicos.size === 1) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Todas las cartas en orden ascendente":
          if (!this.indexMisionCumplida.includes(i)) {
              const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
              const ascendentes = (nums[0] < nums[1] && nums[1] < nums[2] && nums[2] < nums[3]);
              if (ascendentes) {
                  this.indexMisionCumplida.push(i);
              }
          }
          break;

          case "Todas las cartas en orden descendente":
            if (!this.indexMisionCumplida.includes(i)) {
              const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
              const descendentes = (nums[0] > nums[1] && nums[1] > nums[2] && nums[2] > nums[3]);
              if (descendentes) {
                  this.indexMisionCumplida.push(i);
              }
            }
            break;

        case "Cuatro números diferentes":
          if (!this.indexMisionCumplida.includes(i)) {
            const nums = new Set([parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)]);
            if (nums.size === 4) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Dos números primos y dos no primos":
          if (!this.indexMisionCumplida.includes(i)) {
            const primos = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].filter(num => {
              for (let j = 2; j <= Math.sqrt(num); j++) {
                if (num % j === 0) return false;
              }
              return num > 1;
            }).length;
            if (primos === 2) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Cuatro números consecutivos":
          if (!this.indexMisionCumplida.includes(i)) {
            const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].sort((a, b) => a - b);
            if (nums[0] + 1 === nums[1] && nums[1] + 1 === nums[2] && nums[2] + 1 === nums[3]) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Dos números ascendentes y dos descendentes":
          if (!this.indexMisionCumplida.includes(i)) {
              const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
              const ok = (nums[0] < nums[1] && nums[2] > nums[3]);
              if (ok) {
                  this.indexMisionCumplida.push(i);
              }
          }
          break;

        case "Dos números idénticos y dos diferentes":
          if (!this.indexMisionCumplida.includes(i)) {
            const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
            const unicos = new Set(nums);
            if (unicos.size === 3) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        // case "Dos números consecutivos y dos no consecutivos":
        //   if (!this.indexMisionCumplida.includes(i)) {
        //     const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].sort((a, b) => a - b);
        //     if ((nums[0] + 1 === nums[1] && nums[2] + 1 === nums[3]) || (nums[0] + 1 === nums[1] && nums[1] + 1 === nums[2])) {
        //       this.indexMisionCumplida.push(i);
        //     }
        //   }
        // break;

        case "Cuatro cartas del mismo color":
          if (!this.indexMisionCumplida.includes(i)) {
            if (colorC1 === colorC2 && colorC2 === colorC3 && colorC3 === colorC4) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Todas las cartas de distinto color":
          if (!this.indexMisionCumplida.includes(i)) {
            const colores = new Set([colorC1, colorC2, colorC3, colorC4]);
            if (colores.size === 4) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;
        case "Dos cartas del mismo color y dos diferentes":
          if (!this.indexMisionCumplida.includes(i)) {
            const colores = [colorC1, colorC2, colorC3, colorC4];
            const unicos = new Set(colores);
            if (unicos.size === 3) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Una secuencia ascendente de cuatro cartas":
          if (!this.indexMisionCumplida.includes(i)) {
            const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
            const ascendentes = (nums[0] < nums[1] && nums[1] < nums[2] && nums[2] < nums[3]);
            if (ascendentes) {
                this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Una secuencia descendente de cuatro cartas":
          if (!this.indexMisionCumplida.includes(i)) {
            const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
            const descendentes = (nums[0] > nums[1] && nums[1] > nums[2] && nums[2] > nums[3]);
            if (descendentes) {
                this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Dos números rojos y dos azules":
          if (!this.indexMisionCumplida.includes(i)) {
            const rojos = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'rojo').length;
            const negros = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'azul').length;
            if (rojos === 2 && negros === 2) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Dos números impares y dos pares":
          if (!this.indexMisionCumplida.includes(i)) {
            const impares = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].filter(num => num % 2 !== 0).length;
            const pares = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)].filter(num => num % 2 === 0).length;
            if (impares === 2 && pares === 2) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Tres cartas de palos rojos y una azul":
          if (!this.indexMisionCumplida.includes(i)) {
            const rojos = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'rojo').length;
            const negras = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'azul').length;
            if (rojos === 3 && negras === 1) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Tres cartas de palos verdes y una roja":
          if (!this.indexMisionCumplida.includes(i)) {
            const rojos = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'rojo').length;
            const negras = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'verde').length;
            if (rojos === 1 && negras === 3) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Una carta de cada color":
          if (!this.indexMisionCumplida.includes(i)) {
            const colores = new Set([colorC1, colorC2, colorC3, colorC4]);
            if (colores.size === 4) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Dos cartas rojas y dos amarillas":
          if (!this.indexMisionCumplida.includes(i)) {
            const rojos = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'rojo').length;
            const amarillos = [colorC1, colorC2, colorC3, colorC4].filter(color => color === 'amarillo').length;
            if (rojos === 2 && amarillos === 2) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Todas las cartas del mismo palo":
          if (!this.indexMisionCumplida.includes(i)) {
            const colores = new Set([colorC1, colorC2, colorC3, colorC4]);
            if (colores.size === 1) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Todas las cartas de distinto palo":
          if (!this.indexMisionCumplida.includes(i)) {
            const palos = new Set([colorC1, colorC2, colorC3, colorC4]);
            if (palos.size === 4) {
              this.indexMisionCumplida.push(i);
            }
          }
        break;

        case "Dos cartas del mismo número y dos cartas del mismo color":
          if (!this.indexMisionCumplida.includes(i)) {
            const colores = new Set([colorC1, colorC2, colorC3, colorC4]);
            const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
            const numsUnicos = new Set(nums);
            const colorUnicos = new Set(colores);

            if (numsUnicos.size === 3 && colorUnicos.size === 3) {
              this.indexMisionCumplida.push(i);
            }
          }
          break;

        case "Sin repetir colores y dos números que sumen 10":
          if (!this.indexMisionCumplida.includes(i)) {
            const nums = [parseInt(numC1), parseInt(numC2), parseInt(numC3), parseInt(numC4)];
            // Generar todas las combinaciones posibles de pares de números
            const pairs = [];
            for (let i = 0; i < nums.length; i++) {
              for (let j = i + 1; j < nums.length; j++) {
                pairs.push([nums[i], nums[j]]);
              }
            }

            // Verificar si alguna combinación suma 10
            const hasPairSummingTen = pairs.some(pair => pair[0] + pair[1] === 10);

            // Verificar si todas las cartas tienen diferentes colores
            const colores = [colorC1, colorC2, colorC3, colorC4];
            const uniqueColores = new Set(colores);
            const hasDifferentColors = uniqueColores.size === 4;

            if (hasPairSummingTen && hasDifferentColors) {
              this.indexMisionCumplida.push(i);
            }
          }
          break;

        case "Tres cartas del mismo color":
          if (!this.indexMisionCumplida.includes(i)) {
            const colores = new Set([colorC1, colorC2, colorC3, colorC4]);
            if (colores.size === 2) {
              this.indexMisionCumplida.push(i);
            }
          }
          break;



      }
    }

    // console.log(this.indexMisionCumplida);

    if (this.indexMisionCumplida.length > 0){
      for (let i=0; i < this.indexMisionCumplida.length; i++){
        setTimeout(()=>{
          this.mazoMisionesCompletadas.push(this.mazoMisionesAMostrar[this.indexMisionCumplida[i]]);
          this.mazoMisionesAMostrar[this.indexMisionCumplida[i]] = this.mazoMisiones.shift()!;
          // console.log('this.mazoMisionesCompletadas');
          // console.log(this.mazoMisionesCompletadas);
          // console.log('this.mazoMisionesAMostrar');
          // console.log(this.mazoMisionesAMostrar);
          // this.comprobarMisiones();
        }, 2000);
      }

      setTimeout(()=>{
        //Eliminamos las misiones nulas, para no mostrar la tarjeta vacía
        this.mazoMisionesAMostrar = this.mazoMisionesAMostrar.filter((mision: any) => {
          return mision !== undefined && mision !== null;
        });
        this.mazoMisionesCompletadas = this.mazoMisionesCompletadas.filter((mision: any) =>{
          return mision !== undefined && mision !== null;
        });
        // console.log('this.mazoMisionesAMostrar sin undefined');
        // console.log(this.mazoMisionesAMostrar);
      }, 2000);

      this.robaCartaMision.next(true);
    }

    setTimeout(()=>{
      if (this.mazoMisionesAMostrar.length == 0){
        this.motivoFinPartida = '¡Misión Cumplida! Has completado todas las misiones';
        this.finPartida.next(true);
      }
    }, 2000);

    setTimeout(()=>{
      this.indexMisionCumplida = [];
      this.robaCartaMision.next(false);
    }, 2000);

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
      "Tres números ascendentes y uno descendente",
      "Cuatro cartas de palos diferentes",
      "Todas las cartas en orden ascendente",
      "Todas las cartas en orden descendente",
      "Cuatro números diferentes",
      "Dos números primos y dos no primos",
      "Cuatro números consecutivos",
      "Dos números ascendentes y dos descendentes",
      "Dos números idénticos y dos diferentes",
      "Cuatro cartas del mismo color",
      "Todas las cartas de distinto color",
      "Dos cartas del mismo color y dos diferentes",
      "Una secuencia ascendente de cuatro cartas",
      "Una secuencia descendente de cuatro cartas",
      "Dos números rojos y dos azules",
      "Dos números impares y dos pares",
      "Tres cartas de palos rojos y una azul",
      "Tres cartas de palos verdes y una roja",
      "Dos cartas rojas y dos amarillas",
      "Todas las cartas del mismo palo",
      "Todas las cartas de distinto palo",
      "Cuatro cartas del mismo palo",
      "Suma de números igual a 12",
      "Suma de números igual a 9",
      "Dos cartas del mismo número y dos cartas del mismo color",
      "Sin repetir colores y dos números que sumen 10",
      "Tres cartas del mismo color"
    ];

    // Agregamos las misiones al array misiones
    this.misiones.push(...misiones);
    this.misiones.sort(() => Math.random() - 0.5);
  }

}
