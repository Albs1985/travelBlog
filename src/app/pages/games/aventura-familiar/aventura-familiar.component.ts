import { Component, ElementRef, HostListener, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NivelConfig,
  PERSONAJES_FAMILIA,
  PersonajeFamiliar,
  generarNivel
} from './juego.models';
import { JuegoEstadoService } from './juego-estado.service';

@Component({
  selector: 'app-aventura-familiar',
  standalone: true,
  imports: [CommonModule],
  providers: [JuegoEstadoService],
  template: `
    <div class="game-wrapper">
      <!-- PANTALLA 1: SELECTOR DE PERSONAJE -->
      <section *ngIf="(estadoService.pantalla$ | async) === 'SELECCION'" class="selector-screen">
        <header class="selector-header">
          <h2>🌍 La Aventura Familiar</h2>
          <p>Elige quién recorrerá nuestros recuerdos de viaje</p>
          <div *ngIf="estadoService.recordFamiliar" class="record-badge">
            🏆 Récord Familiar: <strong>{{ estadoService.recordFamiliar.nombre }}</strong> ({{ estadoService.recordFamiliar.puntos }} pts)
          </div>
        </header>

        <div class="cards-grid">
          <article *ngFor="let p of personajes"
                   class="character-card"
                   [style.border-color]="p.colorBorde"
                   (click)="elegirJugador(p)">

            <div class="avatar-ring" [style.background]="p.colorBorde">
              <img [src]="p.fotoUrl" [alt]="p.nombre" (error)="onImgError($event, p.nombre)">
            </div>

            <h3>{{ p.nombre }}</h3>
            <span class="role-badge" [style.background]="p.colorBorde">{{ p.rol }}</span>
            <p class="bio-metrics">📏 {{ p.alturaCm }} cm · ⚖️ {{ p.pesoKg }} kg</p>

            <div class="stats-list">
              <div class="stat-row">
                <span>⚡ Velocidad</span>
                <div class="bar"><div class="fill" [style.width.%]="(p.velocidad / 7) * 100"></div></div>
              </div>
              <div class="stat-row">
                <span>🦘 Agilidad</span>
                <div class="bar"><div class="fill" [style.width.%]="(100 - p.pesoKg) * 0.9"></div></div>
              </div>
              <div class="stat-row">
                <span>❤️ Vidas</span>
                <strong>{{ '❤️'.repeat(p.vidasIniciales) }}</strong>
              </div>
            </div>

            <button class="play-btn" [style.background]="p.colorBorde">¡Jugar!</button>
          </article>
        </div>
      </section>

      <!-- PANTALLA 2: CANVAS DE JUEGO 2D -->
      <section *ngIf="(estadoService.pantalla$ | async) === 'JUGANDO'" class="play-screen">
        <div class="hud" *ngIf="jugadorActual">
          <div class="hud-player">
            <img [src]="jugadorActual.fotoUrl" [alt]="jugadorActual.nombre" (error)="onImgError($event, jugadorActual.nombre)">
            <div>
              <div class="hud-name">{{ jugadorActual.nombre }}</div>
              <small>{{ nivelData?.titulo }}</small>
            </div>
          </div>

          <div class="progress-wrapper">
            <span>Meta: {{ porcentajeProgreso }}%</span>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="porcentajeProgreso"></div>
            </div>
          </div>

          <div class="hud-stats">
            <span>🪙 {{ estadoService.puntuacion }}</span>
            <span>{{ '❤️'.repeat(estadoService.vidas) }}</span>
          </div>

          <div class="hud-actions">
            <button class="btn-sound" (click)="sonidoActivo = !sonidoActivo" title="Activar/Desactivar sonido">
              {{ sonidoActivo ? '🔊' : '🔇' }}
            </button>
            <button class="btn-exit" (click)="salirAlMenu()">Salir</button>
          </div>
        </div>

        <div class="canvas-container">
          <canvas #gameCanvas width="860" height="450"></canvas>

          <!-- CONTROLES TÁCTILES SUPERPUESTOS (Móvil / Tablet) -->
          <div class="touch-controls">
            <div class="touch-dpad">
              <button class="touch-btn"
                      (touchstart)="setControlTactil('ArrowLeft', true, $event)"
                      (touchend)="setControlTactil('ArrowLeft', false, $event)"
                      (mousedown)="setControlTactil('ArrowLeft', true, $event)"
                      (mouseup)="setControlTactil('ArrowLeft', false, $event)"
                      (mouseleave)="setControlTactil('ArrowLeft', false, $event)">◀</button>
              <button class="touch-btn"
                      (touchstart)="setControlTactil('ArrowRight', true, $event)"
                      (touchend)="setControlTactil('ArrowRight', false, $event)"
                      (mousedown)="setControlTactil('ArrowRight', true, $event)"
                      (mouseup)="setControlTactil('ArrowRight', false, $event)"
                      (mouseleave)="setControlTactil('ArrowRight', false, $event)">▶</button>
            </div>

            <button class="touch-btn jump-btn"
                    (touchstart)="setControlTactil('Space', true, $event)"
                    (touchend)="setControlTactil('Space', false, $event)"
                    (mousedown)="setControlTactil('Space', true, $event)"
                    (mouseup)="setControlTactil('Space', false, $event)"
                    (mouseleave)="setControlTactil('Space', false, $event)">SALTAR</button>
          </div>
        </div>

        <div class="controls-hint">
          ⌨️ PC: <strong>Flechas ◀ ▶</strong> o <strong>A / D</strong> para moverte, <strong>Espacio</strong> para saltar (salta sobre los enemigos para derrotarlos).
        </div>
      </section>

      <!-- PANTALLA INTERMEDIA: NIVEL COMPLETADO -->
      <section *ngIf="(estadoService.pantalla$ | async) === 'NIVEL_COMPLETADO'" class="status-screen">
        <h2>🎉 ¡Etapa Completada!</h2>
        <p>Has llegado al final del recorrido con <strong>{{ estadoService.puntuacion }} puntos</strong>.</p>
        <button class="play-btn" style="max-width: 240px; background: #0284c7;" (click)="siguienteNivel()">
          Ir al Nivel {{ estadoService.nivelActual }} ➔
        </button>
      </section>

      <!-- PANTALLA FINAL: VICTORIA O GAME OVER -->
      <section *ngIf="(estadoService.pantalla$ | async) === 'VICTORIA' || (estadoService.pantalla$ | async) === 'GAME_OVER'" class="status-screen">
        <h2>{{ (estadoService.pantalla$ | async) === 'VICTORIA' ? '🏆 ¡Aventura Familiar Completada!' : '💔 ¡Oh no! Te quedaste sin vidas' }}</h2>
        <p>Puntuación total conseguida: <strong>{{ estadoService.puntuacion }} puntos</strong></p>
        <p *ngIf="estadoService.recordFamiliar" style="color: #0284c7; font-weight: bold;">
          🌟 Récord Familiar: {{ estadoService.recordFamiliar.nombre }} - {{ estadoService.recordFamiliar.puntos }} pts
        </p>
        <button class="play-btn" style="max-width: 240px; background: #16a34a;" (click)="salirAlMenu()">
          Volver a Elegir Personaje
        </button>
      </section>
    </div>
  `,
  styles: [`
    .game-wrapper {
      max-width: 900px;
      margin: 20px auto;
      padding: 18px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
      font-family: system-ui, -apple-system, sans-serif;
      user-select: none;
    }
    .selector-header { text-align: center; margin-bottom: 20px; }
    .selector-header h2 { margin: 0; font-size: 2rem; color: #0c4a6e; }
    .selector-header p { margin: 6px 0; color: #0369a1; }
    .record-badge {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      margin-top: 6px;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 16px;
    }
    .character-card {
      background: white;
      border-radius: 14px;
      border: 3px solid transparent;
      padding: 16px 14px;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .character-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 20px rgba(0,0,0,0.12);
    }
    .avatar-ring {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      padding: 4px;
      margin-bottom: 8px;
    }
    .avatar-ring img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .character-card h3 { margin: 4px 0; font-size: 1.2rem; color: #1e293b; }
    .role-badge {
      color: white;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 12px;
    }
    .bio-metrics {
      font-size: 0.78rem;
      color: #64748b;
      margin: 8px 0 12px;
      font-weight: 600;
    }
    .stats-list {
      width: 100%;
      font-size: 0.78rem;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #475569;
    }
    .bar {
      flex: 1;
      height: 6px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      max-width: 75px;
    }
    .fill { height: 100%; background: #0ea5e9; }
    .play-btn {
      width: 100%;
      border: none;
      color: white;
      font-weight: bold;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      margin-top: auto;
    }
    .hud {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: white;
      padding: 8px 14px;
      border-radius: 10px;
      margin-bottom: 10px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .hud-player { display: flex; align-items: center; gap: 10px; }
    .hud-player img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid white; }
    .hud-name { font-weight: bold; font-size: 0.95rem; }
    .progress-wrapper { flex: 1; max-width: 200px; font-size: 0.75rem; }
    .progress-track { height: 8px; background: #334155; border-radius: 4px; overflow: hidden; margin-top: 3px; }
    .progress-fill { height: 100%; background: #38bdf8; transition: width 0.15s; }
    .hud-stats { display: flex; gap: 14px; font-weight: bold; }
    .hud-actions { display: flex; gap: 6px; align-items: center; }
    .btn-sound {
      background: #334155;
      color: white;
      border: none;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-exit { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
    .canvas-container {
      position: relative;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 20px rgba(0,0,0,0.18);
      background: #bae6fd;
    }
    canvas {
      display: block;
      width: 100%;
      height: auto;
    }
    .touch-controls {
      position: absolute;
      bottom: 12px;
      left: 14px;
      right: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      pointer-events: none;
    }
    .touch-dpad {
      display: flex;
      gap: 12px;
      pointer-events: auto;
    }
    .touch-btn {
      pointer-events: auto;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.55);
      border: 2px solid rgba(255, 255, 255, 0.75);
      color: white;
      font-size: 1.3rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      touch-action: manipulation;
    }
    .touch-btn:active {
      background: rgba(2, 132, 199, 0.85);
      transform: scale(0.94);
    }
    .jump-btn {
      width: 78px;
      height: 54px;
      border-radius: 28px;
      font-size: 0.85rem;
      background: rgba(22, 163, 74, 0.65);
    }
    .controls-hint {
      text-align: center;
      font-size: 0.82rem;
      color: #334155;
      margin-top: 10px;
    }
    .status-screen {
      text-align: center;
      padding: 50px 20px;
      background: white;
      border-radius: 14px;
    }
  `]
})
export class AventuraFamiliarComponent implements OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  estadoService = inject(JuegoEstadoService);
  personajes = PERSONAJES_FAMILIA;
  jugadorActual: PersonajeFamiliar | null = null;
  nivelData: NivelConfig | null = null;

  private caraImg = new Image();
  private caraCargada = false;
  private fondoImg = new Image();
  private fondoCargado = false;

  private player = {
    x: 80,
    y: 200,
    vx: 0,
    vy: 0,
    ancho: 40,
    alto: 80,
    enSuelo: false,
    mirandoDerecha: true,
    pasoAnim: 0,
    idleAnim: 0,
    invulnerableFrames: 0
  };

  private camaraX = 0;
  private teclas: { [key: string]: boolean } = {};
  private animFrameId: number | null = null;
  porcentajeProgreso = 0;

  sonidoActivo = true;
  private audioCtx: AudioContext | null = null;

  elegirJugador(personaje: PersonajeFamiliar): void {
    this.jugadorActual = personaje;
    this.estadoService.seleccionarPersonaje(personaje);

    // Proporciones humanas ajustadas (180cm -> ~98px | 100cm -> ~58px)
    this.player.alto = Math.round(personaje.alturaCm * 0.55);
    this.player.ancho = Math.round(28 + (personaje.pesoKg * 0.22));

    this.cargarFotoJugador(personaje);
    setTimeout(() => this.iniciarNivel(1), 50);
  }

  private cargarFotoJugador(personaje: PersonajeFamiliar): void {
    this.caraCargada = false;
    this.caraImg = new Image();
    this.caraImg.onload = () => (this.caraCargada = true);
    this.caraImg.onerror = () => {
      this.caraImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(personaje.nombre)}&background=random&size=128`;
    };
    this.caraImg.src = personaje.fotoUrl;
  }

  iniciarNivel(numNivel: number): void {
    this.nivelData = generarNivel(numNivel);
    this.player.x = 80;
    this.player.y = 220;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invulnerableFrames = 0;
    this.camaraX = 0;
    this.porcentajeProgreso = 0;

    this.fondoCargado = false;
    this.fondoImg = new Image();
    this.fondoImg.onload = () => (this.fondoCargado = true);
    this.fondoImg.src = this.nivelData.fondoFotoUrl;

    this.detenerBucle();
    this.bucleJuego();
  }

  siguienteNivel(): void {
    this.estadoService.continuarSiguienteNivel();
    setTimeout(() => this.iniciarNivel(this.estadoService.nivelActual), 50);
  }

  salirAlMenu(): void {
    this.detenerBucle();
    this.estadoService.reiniciar();
  }

  setControlTactil(codigo: string, activo: boolean, event: Event): void {
    event.preventDefault();
    this.teclas[codigo] = activo;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    this.teclas[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    this.teclas[e.code] = false;
  }

  private bucleJuego(): void {
    this.actualizarFisica();
    this.dibujarEscena();
    this.animFrameId = requestAnimationFrame(() => this.bucleJuego());
  }

  private actualizarFisica(): void {
    if (!this.jugadorActual || !this.nivelData) return;

    if (this.player.invulnerableFrames > 0) {
      this.player.invulnerableFrames--;
    }

    const vel = this.jugadorActual.velocidad;
    const gravedad = 0.42 + (this.jugadorActual.pesoKg / 80) * 0.24;

    if (this.teclas['ArrowRight'] || this.teclas['KeyD']) {
      this.player.vx = vel;
      this.player.mirandoDerecha = true;
      this.player.pasoAnim += 0.28;
    } else if (this.teclas['ArrowLeft'] || this.teclas['KeyA']) {
      this.player.vx = -vel;
      this.player.mirandoDerecha = false;
      this.player.pasoAnim += 0.28;
    } else {
      this.player.vx *= 0.8;
      if (Math.abs(this.player.vx) < 0.2) {
        this.player.vx = 0;
        this.player.pasoAnim = 0;
      }
    }

    // Ciclo sutil de respiración cuando está quieto
    this.player.idleAnim += 0.08;

    if ((this.teclas['Space'] || this.teclas['ArrowUp'] || this.teclas['KeyW']) && this.player.enSuelo) {
      this.player.vy = this.jugadorActual.fuerzaSalto;
      this.player.enSuelo = false;
      this.reproducirSonido('salto');
    }

    this.player.x += this.player.vx;
    if (this.player.x < 0) this.player.x = 0;

    this.player.vy += gravedad;
    this.player.y += this.player.vy;
    this.player.enSuelo = false;

    for (const plat of this.nivelData.plataformas) {
      const colisionX = this.player.x + this.player.ancho > plat.x && this.player.x < plat.x + plat.ancho;
      const colisionY = this.player.y + this.player.alto > plat.y && this.player.y < plat.y + plat.alto;

      if (colisionX && colisionY) {
        const piesPrevios = this.player.y + this.player.alto - this.player.vy;
        if (piesPrevios <= plat.y + 10 && this.player.vy >= 0) {
          this.player.y = plat.y - this.player.alto;
          this.player.vy = 0;
          this.player.enSuelo = true;
        } else if (plat.tipo === 'obstaculo') {
          if (this.player.vx > 0) this.player.x = plat.x - this.player.ancho;
          if (this.player.vx < 0) this.player.x = plat.x + plat.ancho;
        }
      }
    }

    for (const enemigo of this.nivelData.enemigos) {
      if (enemigo.eliminado) continue;

      enemigo.x += enemigo.vx;
      if (enemigo.x <= enemigo.limiteIzq || enemigo.x + enemigo.ancho >= enemigo.limiteDer) {
        enemigo.vx *= -1;
      }

      const tocaX = this.player.x + this.player.ancho > enemigo.x && this.player.x < enemigo.x + enemigo.ancho;
      const tocaY = this.player.y + this.player.alto > enemigo.y && this.player.y < enemigo.y + enemigo.alto;

      if (tocaX && tocaY) {
        const piesPrevios = this.player.y + this.player.alto - this.player.vy;
        if (this.player.vy > 0 && piesPrevios <= enemigo.y + 14) {
          enemigo.eliminado = true;
          this.player.vy = -10;
          this.estadoService.sumarPuntos(50);
          this.reproducirSonido('aplastar');
        } else if (this.player.invulnerableFrames === 0) {
          this.reproducirSonido('dano');
          const gameOver = this.estadoService.perderVida();
          if (gameOver) {
            this.detenerBucle();
            return;
          }
          this.player.invulnerableFrames = 90;
          this.player.vy = -8;
        }
      }
    }

    for (const premio of this.nivelData.premios) {
      if (!premio.recogido) {
        const dx = (this.player.x + this.player.ancho / 2) - premio.x;
        const dy = (this.player.y + this.player.alto / 2) - premio.y;
        if (Math.hypot(dx, dy) < 34) {
          premio.recogido = true;
          this.estadoService.sumarPuntos(premio.valor);
          this.reproducirSonido('moneda');
        }
      }
    }

    if (this.player.y > 480) {
      this.reproducirSonido('dano');
      const gameOver = this.estadoService.perderVida();
      if (gameOver) {
        this.detenerBucle();
        return;
      } else {
        this.player.x = Math.max(80, this.player.x - 250);
        this.player.y = 120;
        this.player.vy = 0;
        this.player.invulnerableFrames = 60;
      }
    }

    const canvasWidth = 860;
    this.camaraX = Math.max(0, Math.min(this.player.x - 250, this.nivelData.anchoTotal - canvasWidth));
    this.porcentajeProgreso = Math.min(100, Math.round((this.player.x / this.nivelData.metaX) * 100));

    if (this.player.x >= this.nivelData.metaX) {
      this.reproducirSonido('meta');
      this.detenerBucle();
      this.estadoService.completarNivel();
    }
  }

  private dibujarEscena(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.nivelData || !this.jugadorActual) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    if (this.fondoCargado) {
      const progresoRatio = this.camaraX / (this.nivelData.anchoTotal - W);
      const imgAspect = this.fondoImg.width / this.fondoImg.height;
      const drawHeight = H;
      const drawWidth = Math.max(W * 1.8, H * imgAspect);
      const offsetX = -progresoRatio * (drawWidth - W);
      ctx.drawImage(this.fondoImg, offsetX, 0, drawWidth, drawHeight);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = this.nivelData.colorRespaldoCielo;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.save();
    ctx.translate(-this.camaraX, 0);

    for (const plat of this.nivelData.plataformas) {
      if (plat.x + plat.ancho < this.camaraX || plat.x > this.camaraX + W) continue;

      if (plat.tipo === 'suelo') {
        ctx.fillStyle = '#65a30d';
        ctx.fillRect(plat.x, plat.y, plat.ancho, 14);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(plat.x, plat.y + 14, plat.ancho, plat.alto - 14);
      } else if (plat.tipo === 'flotante') {
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.ancho, plat.alto, 8);
        ctx.fill();
      } else if (plat.tipo === 'obstaculo') {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.ancho, plat.alto, 6);
        ctx.fill();
        ctx.strokeStyle = '#fef2f2';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x + 6, plat.y + 6, plat.ancho - 12, plat.alto - 12);
      }
    }

    for (const enemigo of this.nivelData.enemigos) {
      if (enemigo.eliminado || enemigo.x + enemigo.ancho < this.camaraX || enemigo.x > this.camaraX + W) continue;

      ctx.fillStyle = '#9333ea';
      ctx.beginPath();
      ctx.arc(enemigo.x + enemigo.ancho / 2, enemigo.y + 18, 16, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#581c87';
      ctx.fillRect(enemigo.x + 4, enemigo.y + 18, enemigo.ancho - 8, 12);

      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(enemigo.x + 11, enemigo.y + 13, 3.5, 0, Math.PI * 2);
      ctx.arc(enemigo.x + 23, enemigo.y + 13, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(enemigo.x + 11, enemigo.y + 13, 1.5, 0, Math.PI * 2);
      ctx.arc(enemigo.x + 23, enemigo.y + 13, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const premio of this.nivelData.premios) {
      if (premio.recogido || premio.x < this.camaraX - 30 || premio.x > this.camaraX + W + 30) continue;

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(premio.x, premio.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(this.nivelData.metaX, 180, 6, 200);
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(this.nivelData.metaX + 6, 180);
    ctx.lineTo(this.nivelData.metaX + 75, 205);
    ctx.lineTo(this.nivelData.metaX + 6, 230);
    ctx.fill();

    const visible = this.player.invulnerableFrames === 0 || Math.floor(this.player.invulnerableFrames / 5) % 2 === 0;
    if (visible) {
      this.dibujarPersonajeArticulado(ctx);
    }

    ctx.restore();
  }

  /**
   * Renderizado humano articulado con cinemática de carrera, salto y respiración
   */
  private dibujarPersonajeArticulado(ctx: CanvasRenderingContext2D): void {
    if (!this.jugadorActual) return;

    const { x, y, ancho, alto, pasoAnim, idleAnim, enSuelo, mirandoDerecha, vx } = this.player;
    const estaCorriendo = Math.abs(vx) > 0.3 && enSuelo;

    // Rebote vertical natural al correr o respirar
    const reboteY = estaCorriendo
      ? Math.abs(Math.sin(pasoAnim)) * -4
      : Math.sin(idleAnim) * 1.5;

    ctx.save();
    // Centro horizontal del personaje y volteo según dirección
    const centroX = x + ancho / 2;
    ctx.translate(centroX, y + alto);
    if (!mirandoDerecha) {
      ctx.scale(-1, 1);
    }

    // Sombra suave bajo los pies si está en el suelo
    if (enSuelo) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 0, ancho * 0.45, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Proporciones anatómicas según altura y peso real
    const radioCabeza = this.jugadorActual.alturaCm < 150 ? 20 : 22;
    const cuerpoDisponible = alto - radioCabeza * 2;
    const largoTorso = cuerpoDisponible * 0.48;
    const largoMuslo = cuerpoDisponible * 0.26;
    const largoPantorrilla = cuerpoDisponible * 0.26;
    const grosorExtremidad = Math.max(5.5, ancho * 0.19);

    const baseCaderaY = -largoMuslo - largoPantorrilla + reboteY;
    const baseHombroY = baseCaderaY - largoTorso;
    const centroCabezaY = baseHombroY - radioCabeza - 3;

    // Ángulos articulares según estado (Corriendo / Saltando / Quieto)
    let anguloPiernaDel = 0;
    let anguloRodillaDel = 0;
    let anguloPiernaTras = 0;
    let anguloRodillaTras = 0;
    let anguloBrazoDel = 0;
    let anguloCodoDel = 0.2;
    let anguloBrazoTras = 0;
    let anguloCodoTras = 0.2;
    let inclinacionTorso = 0;

    if (!enSuelo) {
      // Pose dinámica de salto
      inclinacionTorso = 0.14;
      anguloPiernaDel = -0.65;
      anguloRodillaDel = 1.1;
      anguloPiernaTras = 0.45;
      anguloRodillaTras = 0.5;
      anguloBrazoDel = -2.3; // Brazo hacia arriba al saltar
      anguloCodoDel = -0.4;
      anguloBrazoTras = 0.7;
      anguloCodoTras = -0.5;
    } else if (estaCorriendo) {
      // Ciclo biomecánico de carrera (brazos opuestos a piernas)
      inclinacionTorso = 0.12;
      const ciclo = Math.sin(pasoAnim);
      anguloPiernaDel = ciclo * 0.75;
      anguloRodillaDel = Math.max(0, -ciclo * 0.9 + 0.35);

      anguloPiernaTras = -ciclo * 0.75;
      anguloRodillaTras = Math.max(0, ciclo * 0.9 + 0.35);

      anguloBrazoDel = -ciclo * 0.75;
      anguloCodoDel = -0.55 - Math.max(0, -ciclo * 0.4);

      anguloBrazoTras = ciclo * 0.75;
      anguloCodoTras = -0.55 - Math.max(0, ciclo * 0.4);
    } else {
      // Pose relajada de espera (respiración suave)
      anguloBrazoDel = Math.sin(idleAnim) * 0.05;
      anguloBrazoTras = -Math.sin(idleAnim) * 0.05;
    }

    const colorPiel = '#f1c27d';
    const colorPantalon = '#1e3a8a';
    const colorZapato = '#334155';

    // 1. BRAZO TRASERO (detrás del torso para dar profundidad 3D)
    this.dibujarBrazo(
      ctx,
      0,
      baseHombroY + 5,
      largoTorso * 0.48,
      largoTorso * 0.44,
      grosorExtremidad * 0.85,
      anguloBrazoTras,
      anguloCodoTras,
      this.ajustarBrilloColor(this.jugadorActual.colorRopa, -25),
      colorPiel
    );

    // 2. PIERNA TRASERA
    this.dibujarPierna(
      ctx,
      0,
      baseCaderaY,
      largoMuslo,
      largoPantorrilla,
      grosorExtremidad,
      anguloPiernaTras,
      anguloRodillaTras,
      this.ajustarBrilloColor(colorPantalon, -20),
      colorZapato
    );

    // 3. TORSO Y CUELLO (con ligera inclinación al correr)
    ctx.save();
    ctx.translate(0, baseCaderaY);
    ctx.rotate(inclinacionTorso);

    // Cuello
    ctx.fillStyle = colorPiel;
    ctx.fillRect(-4, -largoTorso - 6, 8, 9);

    // Camiseta anatómica con hombros redondeados
    const anchoTorso = ancho * 0.68;
    ctx.fillStyle = this.jugadorActual.colorRopa;
    ctx.beginPath();
    ctx.roundRect(-anchoTorso / 2, -largoTorso, anchoTorso, largoTorso + 4, [10, 10, 4, 4]);
    ctx.fill();

    // Detalle cuello de camiseta
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -largoTorso + 2, 5, 0, Math.PI);
    ctx.stroke();

    ctx.restore();

    // 4. PIERNA DELANTERA
    this.dibujarPierna(
      ctx,
      0,
      baseCaderaY,
      largoMuslo,
      largoPantorrilla,
      grosorExtremidad,
      anguloPiernaDel,
      anguloRodillaDel,
      colorPantalon,
      colorZapato
    );

    // 5. BRAZO DELANTERO
    this.dibujarBrazo(
      ctx,
      0,
      baseHombroY + 5,
      largoTorso * 0.48,
      largoTorso * 0.44,
      grosorExtremidad * 0.85,
      anguloBrazoDel,
      anguloCodoDel,
      this.jugadorActual.colorRopa,
      colorPiel
    );

    // 6. CABEZA CON FOTO REAL RECORTADA
    const cabezaX = Math.sin(inclinacionTorso) * largoTorso;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cabezaX, centroCabezaY, radioCabeza, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (this.caraCargada) {
      // Si la imagen se volteó por scale(-1,1), la des-volteamos para que la cara no salga invertida
      if (!mirandoDerecha) {
        ctx.scale(-1, 1);
        ctx.drawImage(
          this.caraImg,
          -cabezaX - radioCabeza,
          centroCabezaY - radioCabeza,
          radioCabeza * 2,
          radioCabeza * 2
        );
      } else {
        ctx.drawImage(
          this.caraImg,
          cabezaX - radioCabeza,
          centroCabezaY - radioCabeza,
          radioCabeza * 2,
          radioCabeza * 2
        );
      }
    } else {
      ctx.fillStyle = colorPiel;
      ctx.fill();
    }
    ctx.restore();

    // Borde circular de la cara
    ctx.strokeStyle = this.jugadorActual.colorBorde;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(cabezaX, centroCabezaY, radioCabeza, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private dibujarPierna(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    largoMuslo: number,
    largoPantorrilla: number,
    grosor: number,
    anguloCadera: number,
    anguloRodilla: number,
    colorPantalon: string,
    colorZapato: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(anguloCadera);

    // Muslo
    ctx.strokeStyle = colorPantalon;
    ctx.lineWidth = grosor;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, largoMuslo);
    ctx.stroke();

    // Articulación rodilla -> Pantorrilla
    ctx.translate(0, largoMuslo);
    ctx.rotate(anguloRodilla);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, largoPantorrilla - 3);
    ctx.stroke();

    // Zapato deportivo
    ctx.fillStyle = colorZapato;
    ctx.beginPath();
    ctx.roundRect(-grosor * 0.45, largoPantorrilla - 6, grosor * 1.45, 7, [3, 6, 2, 2]);
    ctx.fill();

    ctx.restore();
  }

  private dibujarBrazo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    largoHombro: number,
    largoAntebrazo: number,
    grosor: number,
    anguloHombro: number,
    anguloCodo: number,
    colorManga: string,
    colorPiel: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(anguloHombro);

    // Manga / Brazo superior
    ctx.strokeStyle = colorManga;
    ctx.lineWidth = grosor;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, largoHombro);
    ctx.stroke();

    // Antebrazo y mano
    ctx.translate(0, largoHombro);
    ctx.rotate(anguloCodo);
    ctx.strokeStyle = colorPiel;
    ctx.lineWidth = grosor * 0.85;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, largoAntebrazo);
    ctx.stroke();

    // Mano
    ctx.fillStyle = colorPiel;
    ctx.beginPath();
    ctx.arc(0, largoAntebrazo, grosor * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private ajustarBrilloColor(hex: string, cantidad: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + cantidad));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + cantidad));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + cantidad));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private reproducirSonido(tipo: 'salto' | 'moneda' | 'aplastar' | 'dano' | 'meta'): void {
    if (!this.sonidoActivo) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const ahora = this.audioCtx.currentTime;
      gain.gain.setValueAtTime(0.08, ahora);

      if (tipo === 'salto') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, ahora);
        osc.frequency.exponentialRampToValueAtTime(580, ahora + 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.15);
        osc.start(ahora);
        osc.stop(ahora + 0.15);
      } else if (tipo === 'moneda') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(980, ahora);
        osc.frequency.setValueAtTime(1310, ahora + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.18);
        osc.start(ahora);
        osc.stop(ahora + 0.18);
      } else if (tipo === 'aplastar') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ahora);
        osc.frequency.exponentialRampToValueAtTime(100, ahora + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.13);
        osc.start(ahora);
        osc.stop(ahora + 0.13);
      } else if (tipo === 'dano') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ahora);
        osc.frequency.linearRampToValueAtTime(90, ahora + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.26);
        osc.start(ahora);
        osc.stop(ahora + 0.26);
      } else if (tipo === 'meta') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, ahora);
        osc.frequency.setValueAtTime(659, ahora + 0.1);
        osc.frequency.setValueAtTime(784, ahora + 0.2);
        osc.frequency.setValueAtTime(1046, ahora + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.55);
        osc.start(ahora);
        osc.stop(ahora + 0.55);
      }
    } catch {}
  }

  onImgError(event: Event, nombre: string): void {
    const img = event.target as HTMLImageElement;
    img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&size=128`;
  }

  private detenerBucle(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  ngOnDestroy(): void {
    this.detenerBucle();
  }
}
