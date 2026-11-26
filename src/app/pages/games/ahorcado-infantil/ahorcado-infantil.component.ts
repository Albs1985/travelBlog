import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

export interface ChildrenTheme {
  id: number;
  name: string;
  icon: string;
  words: string[];
  backgroundClass: string;
}

export type GameDifficulty = 'Fácil' | 'Normal' | 'Difícil';
export type ModoTemaSeleccion = 'aleatorio' | 'elegir' | 'personalizado';

@Component({
  selector: 'app-ahorcado-infantil',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RouterModule],
  templateUrl: './ahorcado-infantil.component.html',
  styleUrls: ['./ahorcado-infantil.component.css']
})
export class AhorcadoInfantilComponent implements OnInit, OnDestroy {
  themes: ChildrenTheme[] = [
    {
      id: 1, name: 'Películas y series', icon: '🎬',
      words: ['FROZEN', 'COCO', 'TOY STORY', 'CARS', 'DUMBO', 'NEMO', 'MULAN', 'ALADDIN', 'GUERRERAS KPOP', 'DRAGON BALL', 'KARATE KID', 'NINJAGO', 'BEBES LLORONES', 'EL BEBE JEFAZO'],
      backgroundClass: 'theme-disney'
    },
    {
      id: 2, name: 'Juegos de Parque', icon: '⚽',
      words: ['PELOTA', 'TOBOGAN', 'COLUMPIO', 'ARENA', 'CUERDA', 'COMETA', 'PATINES'],
      backgroundClass: 'theme-park'
    },
    {
      id: 3, name: 'Animales de Granja', icon: '🐷',
      words: ['PERRO', 'GATO', 'VACA', 'OVEJA', 'PATO', 'CERDO', 'GALLINA', 'CABALLO', 'BURRO', 'CONEJO'],
      backgroundClass: 'theme-farm'
    }
  ];

  drawImages: string[] = [
    'assets/icons/h0.svg',
    'assets/icons/h1.svg',
    'assets/icons/h2.svg',
    'assets/icons/h3.svg',
    'assets/icons/h4.svg',
    'assets/icons/h5.svg',
    'assets/icons/h6.svg'
  ];

  keyboard: string[][] = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  // Configuración y tema/palabras manuales
  modoTema: ModoTemaSeleccion = 'aleatorio';
  temaSeleccionadoId: number = 1;
  nombreTemaPersonalizado: string = '';
  iconoTemaPersonalizado: string = '✨';
  palabrasManualesInput: string = '';
  palabrasPersonalizadasLista: string[] = [];
  errorPersonalizado: string = '';

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

  secondsElapsed: number = 0;
  private timerInterval: any;

  ngOnInit(): void {
    const savedHigh = localStorage.getItem('pequeahorcado_highscore');
    if (savedHigh) {
      this.highScore = parseInt(savedHigh, 10) || 0;
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private limpiarPalabra(raw: string): string {
    return raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  agregarPalabrasManuales(): void {
    this.errorPersonalizado = '';
    const trozos = this.palabrasManualesInput
      .split(',')
      .map((p) => this.limpiarPalabra(p))
      .filter((p) => p.length > 0);

    if (!trozos.length) {
      return;
    }

    if (this.modoTema === 'elegir') {
      const tema = this.themes.find((t) => t.id === Number(this.temaSeleccionadoId));
      if (tema) {
        for (const w of trozos) {
          if (!tema.words.includes(w)) {
            tema.words.push(w);
          }
        }
      }
    } else if (this.modoTema === 'personalizado') {
      for (const w of trozos) {
        if (!this.palabrasPersonalizadasLista.includes(w)) {
          this.palabrasPersonalizadasLista.push(w);
        }
      }
    }

    this.palabrasManualesInput = '';
  }

  quitarPalabraPersonalizada(index: number): void {
    this.palabrasPersonalizadasLista.splice(index, 1);
  }

  setDifficulty(diff: GameDifficulty): void {
    this.errorPersonalizado = '';
    this.difficulty = diff;
    this.maxLives = this.difficulty === 'Fácil' ? 6 : this.difficulty === 'Normal' ? 5 : 4;

    // Si dejó palabras escritas sin pulsar "+", las incorporamos automáticamente
    if (this.palabrasManualesInput.trim()) {
      this.agregarPalabrasManuales();
    }

    if (this.modoTema === 'personalizado') {
      const nombreLimpio = (this.nombreTemaPersonalizado || '').trim();
      if (!nombreLimpio) {
        this.errorPersonalizado = 'Escribe el nombre del tema o variedad personalizada.';
        return;
      }
      if (!this.palabrasPersonalizadasLista.length) {
        this.errorPersonalizado = 'Añade al menos una palabra para jugar con tu tema personalizado.';
        return;
      }

      const existente = this.themes.find(
        (t) => t.name.toLowerCase() === nombreLimpio.toLowerCase()
      );

      if (existente) {
        for (const w of this.palabrasPersonalizadasLista) {
          if (!existente.words.includes(w)) {
            existente.words.push(w);
          }
        }
        this.themeActual = existente;
      } else {
        const nuevoTema: ChildrenTheme = {
          id: Date.now(),
          name: nombreLimpio,
          icon: (this.iconoTemaPersonalizado || '✨').trim() || '✨',
          words: [...this.palabrasPersonalizadasLista],
          backgroundClass: ''
        };
        this.themes.push(nuevoTema);
        this.temaSeleccionadoId = nuevoTema.id;
        this.themeActual = nuevoTema;
      }
    } else if (this.modoTema === 'elegir') {
      this.themeActual =
        this.themes.find((t) => t.id === Number(this.temaSeleccionadoId)) ?? this.themes[0];
    } else {
      const themeIndex = Math.floor(Math.random() * this.themes.length);
      this.themeActual = this.themes[themeIndex];
    }

    this.startNewGame();
  }

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

    if (!this.themeActual || !this.themeActual.words.length) {
      const themeIndex = Math.floor(Math.random() * this.themes.length);
      this.themeActual = this.themes[themeIndex];
    }

    const wordIndex = Math.floor(Math.random() * this.themeActual.words.length);
    this.palabraActual = this.themeActual.words[wordIndex];

    for (let i = 0; i < this.palabraActual.length; i++) {
      this.guionesOcultos.push(this.palabraActual[i] === ' ' ? ' ' : '_');
    }

    this.gameState = 'playing';
    this.startTimer();
  }

  checkLetter(letra: string): void {
    if (this.gameState !== 'playing' || this.letrasSeleccionadas.includes(letra)) return;

    this.letrasSeleccionadas.push(letra);
    const indicesCorrectos: number[] = [];

    for (let i = 0; i < this.palabraActual.length; i++) {
      if (this.palabraActual[i] === letra) {
        indicesCorrectos.push(i);
      }
    }

    if (indicesCorrectos.length > 0) {
      indicesCorrectos.forEach((idx) => (this.guionesOcultos[idx] = letra));
      const multiplier = this.difficulty === 'Fácil' ? 1 : this.difficulty === 'Normal' ? 1.5 : 2;
      this.score += Math.round(50 * this.combo * multiplier);
      this.combo = Math.min(this.combo + 0.5, 3);
      this.updateHighScore();
      this.checkWinCondition();
    } else {
      this.lives--;
      this.combo = 1;
      this.checkLoseCondition();
    }
  }

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
      this.pistaUsadaEnPalabra = true;
    }
  }

  get currentDrawImage(): string {
    const errorIndex = this.maxLives - this.lives;
    return `assets/icons/h${errorIndex}.svg`;
  }

  getLetterState(letra: string): 'default' | 'correct' | 'incorrect' {
    if (!this.letrasSeleccionadas.includes(letra)) return 'default';
    if (this.palabraActual.includes(letra)) return 'correct';
    return 'incorrect';
  }

  private checkWinCondition(): void {
    if (!this.guionesOcultos.includes('_')) {
      this.gameState = 'won';
      this.stopTimer();
      const timeBonus = Math.max(0, 500 - this.secondsElapsed);
      const lifeBonus = this.lives * 100;
      this.score += Math.round(timeBonus + lifeBonus);
      this.updateHighScore();
    }
  }

  private checkLoseCondition(): void {
    if (this.lives <= 0) {
      this.gameState = 'gameover';
      this.stopTimer();
    }
  }

  private updateHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pequeahorcado_highscore', this.highScore.toString());
    }
  }

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

  resetGame(): void {
    this.stopTimer();
    this.gameState = 'start';
    this.difficulty = 'Fácil';
    this.score = 0;
    this.combo = 1;
    this.themeActual = null;
    this.letrasSeleccionadas = [];
    this.guionesOcultos = [];
    this.errorPersonalizado = '';
  }
}
