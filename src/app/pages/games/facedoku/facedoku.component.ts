import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AvatarItem {
  id: number;
  name: string;
  imageUrl: string;
}

export interface Cell {
  row: number;
  col: number;
  value: number;       // 0 si está vacía, 1-9 para el ID de la cara
  solution: number;    // Respuesta correcta (1-9)
  isInitial: boolean;  // Si venía dada al inicio
  isError: boolean;    // Si el usuario puso una cara incorrecta
  notes: number[];     // Modo notas (borrador)
}

export type Difficulty = 'Fácil' | 'Normal' | 'Difícil';

@Component({
  selector: 'app-facedoku',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './facedoku.component.html',
  styleUrls: ['./facedoku.component.css']
})
export class FacedokuComponent implements OnInit, OnDestroy {
  // REEMPLAZA ESTAS URLS POR TUS ASSETS LOCALES (ej: 'assets/faces/cara1.png')
  // avatars: AvatarItem[] = [
  //   { id: 1, name: 'Ana', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana&backgroundColor=ffdfbf' },
  //   { id: 2, name: 'Luis', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luis&backgroundColor=c0aede' },
  //   { id: 3, name: 'Sofía', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=b6e3f4' },
  //   { id: 4, name: 'Carlos', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&backgroundColor=ffd5dc' },
  //   { id: 5, name: 'Elena', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena&backgroundColor=d1d4f9' },
  //   { id: 6, name: 'Mateo', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mateo&backgroundColor=ffdfbf' },
  //   { id: 7, name: 'Lucía', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucia&backgroundColor=c0aede' },
  //   { id: 8, name: 'Diego', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diego&backgroundColor=b6e3f4' },
  //   { id: 9, name: 'Valeria', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Valeria&backgroundColor=ffd5dc' }
  // ];

  avatars: AvatarItem[] = [
    { id: 1, name: 'Alba', imageUrl: 'assets/images/perfiles/fotoPerfilAlba.jpg' },
    { id: 2, name: 'Albert', imageUrl: 'assets/images/perfiles/fotoPerfilAlbert.jpg' },
    { id: 3, name: 'Blai', imageUrl: 'assets/images/perfiles/fotoPerfilBlai.jpg' },
    { id: 4, name: 'Emili', imageUrl: 'assets/images/perfiles/fotoPerfilEmili.jpg' },
    { id: 5, name: 'Gerard', imageUrl: 'assets/images/perfiles/fotoPerfilGerard.jpg' },
    { id: 6, name: 'Pep', imageUrl: 'assets/images/perfiles/fotoPerfilPep.jpg' },
    { id: 7, name: 'Marcel', imageUrl: 'assets/images/perfiles/fotoPerfilMarcel.jpg' },
    { id: 8, name: 'Maria', imageUrl: 'assets/images/perfiles/fotoPerfilMaria.jpg' },
    { id: 9, name: 'Marina', imageUrl: 'assets/images/perfiles/fotoPerfilMarina.jpg' },
    { id: 10, name: 'Marta', imageUrl: 'assets/images/perfiles/fotoPerfilMarta.jpg' },
    { id: 11, name: 'Mateu', imageUrl: 'assets/images/perfiles/fotoPerfilMateu.jpg' },
    { id: 12, name: 'Matilde', imageUrl: 'assets/images/perfiles/fotoPerfilMatilde.jpg' }
    // { id: 12, name: 'Familia', imageUrl: 'assets/images/perfiles/fotoPerfilFamilia.jpg' },
    // { id: 13, name: 'Familia2', imageUrl: 'assets/images/perfiles/fotoPerfilFamilia2.jpg' },
    // { id: 14, name: 'Fede', imageUrl: 'assets/images/perfiles/fotoPerfilFede.jpg' },
    // { id: 16, name: 'Gloria', imageUrl: 'assets/images/perfiles/fotoPerfilGloria.jpg' },
    // { id: 17, name: 'Jordi', imageUrl: 'assets/images/perfiles/fotoPerfilJordi.jpg' },
    // { id: 18, name: 'LauraPla', imageUrl: 'assets/images/perfiles/fotoPerfilLauraPla.jpg' },
    // { id: 19, name: 'Maiten', imageUrl: 'assets/images/perfiles/fotoPerfilMaiten.jpg' },
    // { id: 22, name: 'Marina', imageUrl: 'assets/images/perfiles/fotoPerfilMarina.jpg' },
    // { id: 25, name: 'Marti', imageUrl: 'assets/images/perfiles/fotoPerfilMarti.jpg' },
    // { id: 28, name: 'Pau', imageUrl: 'assets/images/perfiles/fotoPerfilPau.jpg' },
    // { id: 30, name: 'Teresa', imageUrl: 'assets/images/perfiles/fotoPerfilTeresa.jpg' }
    // { id: 3, name: 'Asier', imageUrl: 'assets/images/perfiles/fotoPerfilAsier.jpg' },
    // { id: 5, name: 'Borja', imageUrl: 'assets/images/perfiles/fotoPerfilBorja.jpg' },
    // { id: 6, name: 'Carles', imageUrl: 'assets/images/perfiles/fotoPerfilCarles.jpg' },
    // { id: 7, name: 'Carlos', imageUrl: 'assets/images/perfiles/fotoPerfilCarlos.jpg' },
    // { id: 8, name: 'Codo', imageUrl: 'assets/images/perfiles/fotoPerfilCodo.jpg' },
    // { id: 9, name: 'Dan', imageUrl: 'assets/images/perfiles/fotoPerfilDan.jpg' },
    // { id: 10, name: 'Dani', imageUrl: 'assets/images/perfiles/fotoPerfilDani.jpg' },
  ];

  board: Cell[][] = [];
  selectedCell: { row: number; col: number } | null = null;

  // Estadísticas y Estado del Juego
  difficulty: Difficulty = 'Fácil';
  score: number = 0;
  highScore: number = 0;
  combo: number = 1;
  lives: number = 3;
  maxLives: number = 3;
  hintsLeft: number = 3;

  // Modos y Modales
  isNoteMode: boolean = false;
  isPaused: boolean = false;
  gameState: 'playing' | 'won' | 'gameover' = 'playing';

  // Temporizador
  secondsElapsed: number = 0;
  private timerInterval: any;

  ngOnInit(): void {
    this.avatars = this.getRandomAvatars();
    const savedHigh = localStorage.getItem('facedoku_highscore');
    if (savedHigh) {
      this.highScore = parseInt(savedHigh, 10);
    }
    this.startNewGame(this.difficulty);
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  getRandomAvatars(count: number = 9): AvatarItem[] {
    // 1. Creamos una copia para no mutar this.avatars
    const shuffled = [...this.avatars];

    // 2. Mezclamos con Fisher-Yates
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 3. Devolvemos los primeros 'count' elementos
    return shuffled.slice(0, count);
  }

  // Inicia una nueva partida
  startNewGame(diff: Difficulty): void {
    this.difficulty = diff;
    this.score = 0;
    this.combo = 1;
    this.lives = this.maxLives;
    this.hintsLeft = 3;
    this.isNoteMode = false;
    this.isPaused = false;
    this.gameState = 'playing';
    this.selectedCell = null;
    this.secondsElapsed = 0;

    this.generateBoard();
    this.startTimer();
  }

  // Generador de tablero Sudoku válido
  private generateBoard(): void {
    const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.fillBoard(solution);

    // Determinar cuántas celdas ocultar según dificultad
    const cellsToRemove = this.difficulty === 'Fácil' ? 30 : this.difficulty === 'Normal' ? 42 : 52;
    const puzzle = solution.map(row => [...row]);

    let removed = 0;
    while (removed < cellsToRemove) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      if (puzzle[r][c] !== 0) {
        puzzle[r][c] = 0;
        removed++;
      }
    }

    // Construir matriz de objetos Cell
    this.board = [];
    for (let r = 0; r < 9; r++) {
      const rowCells: Cell[] = [];
      for (let c = 0; c < 9; c++) {
        const val = puzzle[r][c];
        rowCells.push({
          row: r,
          col: c,
          value: val,
          solution: solution[r][c],
          isInitial: val !== 0,
          isError: false,
          notes: []
        });
      }
      this.board.push(rowCells);
    }
  }

  // Algoritmo Backtracking para resolver/crear tablero
  private fillBoard(grid: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (this.isValidPlacement(grid, r, c, num)) {
              grid[r][c] = num;
              if (this.fillBoard(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  private isValidPlacement(grid: number[][], row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === num || grid[i][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[startRow + r][startCol + c] === num) return false;
      }
    }
    return true;
  }

  private shuffle(array: number[]): number[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Interacción del usuario
  selectCell(row: number, col: number): void {
    if (this.isPaused || this.gameState !== 'playing') return;
    this.selectedCell = { row, col };
  }

  selectAvatar(avatarId: number): void {
    if (!this.selectedCell || this.isPaused || this.gameState !== 'playing') return;

    const { row, col } = this.selectedCell;
    const cell = this.board[row][col];

    // No modificar celdas iniciales o ya acertadas
    if (cell.isInitial || (cell.value === cell.solution && !cell.isError)) return;

    // Modo Notas (Borrador)
    if (this.isNoteMode) {
      cell.value = 0;
      cell.isError = false;
      const idx = cell.notes.indexOf(avatarId);
      if (idx > -1) {
        cell.notes.splice(idx, 1);
      } else {
        cell.notes.push(avatarId);
        cell.notes.sort();
      }
      return;
    }

    // Modo Normal: Colocar cara
    cell.notes = [];
    cell.value = avatarId;

    if (avatarId === cell.solution) {
      // ¡Acierto!
      cell.isError = false;
      const multiplier = this.difficulty === 'Fácil' ? 1 : this.difficulty === 'Normal' ? 1.5 : 2;
      this.score += Math.round(100 * this.combo * multiplier);
      this.combo = Math.min(this.combo + 1, 5); // Combo máximo x5
      this.cleanRelatedNotes(row, col, avatarId);
      this.updateHighScore();
      this.checkWin();
    } else {
      // ¡Error!
      cell.isError = true;
      this.combo = 1;
      this.lives--;
      if (this.lives <= 0) {
        this.gameState = 'gameover';
        this.stopTimer();
      }
    }
  }

  // Limpia automáticamente las notas de esa cara en la misma fila, columna y cuadrante
  private cleanRelatedNotes(row: number, col: number, avatarId: number): void {
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let i = 0; i < 9; i++) {
      this.board[row][i].notes = this.board[row][i].notes.filter(n => n !== avatarId);
      this.board[i][col].notes = this.board[i][col].notes.filter(n => n !== avatarId);
    }

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        this.board[startRow + r][startCol + c].notes =
          this.board[startRow + r][startCol + c].notes.filter(n => n !== avatarId);
      }
    }
  }

  // Herramientas de ayuda
  eraseCell(): void {
    if (!this.selectedCell || this.isPaused || this.gameState !== 'playing') return;
    const cell = this.board[this.selectedCell.row][this.selectedCell.col];
    if (!cell.isInitial && cell.value !== cell.solution) {
      cell.value = 0;
      cell.isError = false;
      cell.notes = [];
    }
  }

  useHint(): void {
    if (this.hintsLeft <= 0 || !this.selectedCell || this.isPaused || this.gameState !== 'playing') return;
    const cell = this.board[this.selectedCell.row][this.selectedCell.col];

    if (!cell.isInitial && cell.value !== cell.solution) {
      this.hintsLeft--;
      cell.value = cell.solution;
      cell.isError = false;
      cell.notes = [];
      this.cleanRelatedNotes(cell.row, cell.col, cell.solution);
      this.checkWin();
    }
  }

  toggleNoteMode(): void {
    this.isNoteMode = !this.isNoteMode;
  }

  togglePause(): void {
    if (this.gameState !== 'playing') return;
    this.isPaused = !this.isPaused;
  }

  // Helpers visuales para el HTML
  getAvatarUrl(id: number): string {
    return this.avatars.find(a => a.id === id)?.imageUrl || '';
  }

  isHighlighted(row: number, col: number): boolean {
    if (!this.selectedCell) return false;
    const { row: sRow, col: sCol } = this.selectedCell;
    const sameBox = Math.floor(row / 3) === Math.floor(sRow / 3) &&
                    Math.floor(col / 3) === Math.floor(sCol / 3);
    return row === sRow || col === sCol || sameBox;
  }

  isSameAvatarSelected(cell: Cell): boolean {
    if (!this.selectedCell || cell.value === 0) return false;
    const selectedVal = this.board[this.selectedCell.row][this.selectedCell.col].value;
    return selectedVal !== 0 && cell.value === selectedVal;
  }

  // Devuelve cuántas veces falta colocar una cara (de 9)
  getRemainingCount(avatarId: number): number {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c].value === avatarId && !this.board[r][c].isError) {
          count++;
        }
      }
    }
    return 9 - count;
  }

  private checkWin(): void {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c].value !== this.board[r][c].solution) {
          return;
        }
      }
    }
    // Bonus por tiempo
    const timeBonus = Math.max(0, 1000 - this.secondsElapsed * 2);
    this.score += timeBonus;
    this.updateHighScore();
    this.gameState = 'won';
    this.stopTimer();
  }

  private updateHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('facedoku_highscore', this.highScore.toString());
    }
  }

  // Control del reloj
  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (!this.isPaused && this.gameState === 'playing') {
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
}
