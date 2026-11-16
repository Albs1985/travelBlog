import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChildrenTheme {
  id: number;
  name: string;
  icon: string; // Emoji o nombre de clase
  words: string[]; // Lista de palabras sencillas
  backgroundClass: string;
}

export type GameDifficulty = 'Fácil' | 'Normal' | 'Difícil';

@Component({
  selector: 'app-ahorcado-infantil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ahorcado-infantil.component.html',
  styleUrls: ['./ahorcado-infantil.component.css']
})
export class AhorcadoInfantilComponent implements OnInit, OnDestroy {
  // Configuración de Temáticas Infantiles y Palabras Sencillas
  themes: ChildrenTheme[] = [
    {
      id: 1, name: 'Películas de Disney', icon: '🎬',
      words: ['FROZEN', 'COCO', 'LUCA', 'TOY STORY', 'CARS', 'DUMBO', 'NEMO', 'MULAN', 'ALADDIN', 'MOANA'],
      backgroundClass: 'theme-disney'
    },
    {
      id: 2, name: 'Juegos de Parque', icon: '⚽',
      words: ['PELOTA', 'TOBOGAN', 'COLUMPIO', 'CARRUSEL', 'ARENA', 'RELOJ', 'CUERDA', 'COMETA', 'PATINES', 'AVION'],
      backgroundClass: 'theme-park'
    },
    {
      id: 3, name: 'Animales de Granja', icon: '🐷',
      words: ['PERRO', 'GATO', 'VACA', 'OVEJA', 'PATO', 'CERDO', 'GALLINA', 'CABALLO', 'BURRO', 'CONEJO'],
      backgroundClass: 'theme-farm'
    }
  ];

  // Las imágenes del "ahorcado" son representaciones visuales (SVG o PNG)
  // que construyen un muñeco de peluche o personaje, no una ejecución.
  // Reemplaza estas rutas por tus assets locales: 'assets/games/ahorcado-infantil/h1.svg'
  drawImages: string[] = [
    'assets/icons/h0.svg', // Base vacía, solo la estructura del columpio
    'assets/icons/h1.svg', // Cabeza del muñeco de peluche
    'assets/icons/h2.svg', // Cabeza + Cuerpo
    'assets/icons/h3.svg', // Cabeza + Cuerpo + 1 Brazo
    'assets/icons/h4.svg', // Cabeza + Cuerpo + 2 Brazos
    'assets/icons/h5.svg', // Cabeza + Cuerpo + 2 Brazos + 1 Pierna
    'assets/icons/h6.svg'  // Muñeco completo, feliz, en el columpio. ¡Perdiste!
  ];

  // Teclado virtual QWERTY
  keyboard: string[][] = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  // Estado del Juego
  difficulty: GameDifficulty = 'Fácil';
  score: number = 0;
  highScore: number = 0;
  combo: number = 1;
  lives: number = 6;
  maxLives: number = 6;
  hintsLeft: number = 3;

  palabraActual: string = '';
  guionesOcultos: string[] = [];
  letrasSeleccionadas: string[] = [];
  themeActual: ChildrenTheme | null = null;
  gameState: 'start' | 'playing' | 'won' | 'gameover' = 'start';
  pistaUsadaEnPalabra: boolean = false;

  // Temporizador
  secondsElapsed: number = 0;
  private timerInterval: any;

  constructor() {}

  ngOnInit(): void {
    const savedHigh = localStorage.getItem('pequeahorcado_highscore');
    if (savedHigh) {
      this.highScore = parseInt(savedHigh, 10);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  // Lógica de Niveles: El usuario elige un nivel de dificultad
  setDifficulty(diff: GameDifficulty): void {
    this.difficulty = diff;
    this.maxLives = this.difficulty === 'Fácil' ? 6 : this.difficulty === 'Normal' ? 5 : 4;
    this.startNewGame();
  }

  // Lógica Principal: Inicia una nueva partida eligiendo una temática y palabra
  startNewGame(): void {
    this.stopTimer();
    this.secondsElapsed = 0;
    this.score = 0;
    this.combo = 1;
    this.lives = this.maxLives;
    this.hintsLeft = 3;
    this.letrasSeleccionadas = [];
    this.guionesOcultos = [];
    this.pistaUsadaEnPalabra = false;

    // Elige temática aleatoria
    const themeIndex = Math.floor(Math.random() * this.themes.length);
    this.themeActual = this.themes[themeIndex];

    // Elige palabra aleatoria de la temática
    const wordIndex = Math.floor(Math.random() * this.themeActual.words.length);
    this.palabraActual = this.themeActual.words[wordIndex];

    // Crea los guiones bajos
    for (let i = 0; i < this.palabraActual.length; i++) {
      this.guionesOcultos.push(this.palabraActual[i] === ' ' ? ' ' : '_');
    }

    this.gameState = 'playing';
    this.startTimer();
  }

  // Interacción del usuario: Al presionar una letra en el teclado virtual
  checkLetter(letra: string): void {
    if (this.gameState !== 'playing' || this.letrasSeleccionadas.includes(letra)) return;

    this.letrasSeleccionadas.push(letra);
    const indicesCorrectos: number[] = [];

    // Comprueba si la letra está en la palabra
    for (let i = 0; i < this.palabraActual.length; i++) {
      if (this.palabraActual[i] === letra) {
        indicesCorrectos.push(i);
      }
    }

    if (indicesCorrectos.length > 0) {
      // ¡Acierto!
      indicesCorrectos.forEach(idx => this.guionesOcultos[idx] = letra);
      const multiplier = this.difficulty === 'Fácil' ? 1 : this.difficulty === 'Normal' ? 1.5 : 2;
      this.score += Math.round(50 * this.combo * multiplier);
      this.combo = Math.min(this.combo + 0.5, 3); // Combo máximo x3
      this.updateHighScore();
      this.checkWinCondition();
    } else {
      // ¡Error!
      this.lives--;
      this.combo = 1;
      this.checkLoseCondition();
    }
  }

  // Lógica de Pistas: Revela una letra no adivinada
  useHint(): void {
    if (this.gameState !== 'playing' || this.hintsLeft <= 0 || this.pistaUsadaEnPalabra) return;

    const indicesNoAdivinados: number[] = [];
    for (let i = 0; i < this.guionesOcultos.length; i++) {
      if (this.guionesOcultos[i] === '_') {
        indicesNoAdivinados.push(i);
      }
    }

    if (indicesNoAdivinados.length > 0) {
      const idxAleatorio = indicesNoAdivinados[Math.floor(Math.random() * indicesNoAdivinados.length)];
      this.checkLetter(this.palabraActual[idxAleatorio]);
      this.hintsLeft--;
      this.pistaUsadaEnPalabra = true; // Solo una pista por palabra
    }
  }

  // Lógica de Dibujo: Actualiza la imagen del "ahorcado" (personaje construyéndose)
  get currentDrawImage(): string {
    const errorIndex = this.maxLives - this.lives;
    // La imagen describe un personaje que se construye o construye un juguete.
    // Ej: h0 es una estrella, h6 es un osito completo en un columpio.
    // Esto es puramente descriptivo, reemplaza con tus archivos locales.
    return `assets/icons/h${errorIndex}.svg`;
  }

  // Devuelve la clase del estado de la letra para estilizar el teclado
  getLetterState(letra: string): 'default' | 'correct' | 'incorrect' {
    if (!this.letrasSeleccionadas.includes(letra)) return 'default';
    if (this.palabraActual.includes(letra)) return 'correct';
    return 'incorrect';
  }

  // Comprueba si el usuario ha ganado
  private checkWinCondition(): void {
    if (!this.guionesOcultos.includes('_')) {
      this.gameState = 'won';
      this.stopTimer();
      // Bonus por tiempo y vidas
      const timeBonus = Math.max(0, 500 - this.secondsElapsed);
      const lifeBonus = this.lives * 100;
      this.score += Math.round(timeBonus + lifeBonus);
      this.updateHighScore();
    }
  }

  // Comprueba si el usuario ha perdido
  private checkLoseCondition(): void {
    if (this.lives <= 0) {
      this.gameState = 'gameover';
      this.stopTimer();
    }
  }

  // Actualiza el récord en el almacenamiento local
  private updateHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pequeahorcado_highscore', this.highScore.toString());
    }
  }

  // Control del temporizador
  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.gameState === 'playing') {
        this.secondsElapsed++;
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  get formattedTime(): string {
    const mins = Math.floor(this.secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (this.secondsElapsed % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  // Reinicia todo para volver a jugar
  resetGame(): void {
    this.gameState = 'start';
    this.difficulty = 'Fácil';
    this.score = 0;
    this.combo = 1;
    this.themeActual = null;
    this.letrasSeleccionadas = [];
    this.guionesOcultos = [];
  }
}
