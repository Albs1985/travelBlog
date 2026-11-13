import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BotonSimon {
  id: number;
  nombre: string;
  avatar: string;
  colorBg: string;
  sonidoFreq: number; // Frecuencia para el sintetizador de audio web
}

@Component({
  selector: 'app-simon',
  templateUrl: './simon.component.html',
  styleUrls: ['./simon.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class SimonComponent implements OnInit {

  // Los 4 miembros de la familia como botones del juego
  public botonesFamilia: BotonSimon[] = [
    { id: 0, nombre: 'Albert', avatar: 'assets/images/perfiles/fotoPerfilAlbert.jpg', colorBg: '#4d7c0f', sonidoFreq: 261.63 }, // Do (C4)
    { id: 1, nombre: 'Alba', avatar: 'assets/images/perfiles/fotoPerfilAlba.jpg', colorBg: '#be185d', sonidoFreq: 329.63 }, // Mi (E4)
    { id: 2, nombre: 'Mateu', avatar: 'assets/images/perfiles/fotoPerfilMateu.jpg', colorBg: '#38a169', sonidoFreq: 392.00 }, // Sol (G4)
    { id: 3, nombre: 'Marina', avatar: 'assets/images/perfiles/fotoPerfilMarina.jpg', colorBg: '#d69e2e', sonidoFreq: 523.25 }  // Do alto (C5)
  ];

  public secuenciaMaquina: number[] = [];
  public secuenciaUsuario: number[] = [];
  
  public ronda: number = 0;
  public recordPersonal: number = 0;
  
  public estadoJuego: 'inicio' | 'reproduciendo' | 'turno_usuario' | 'game_over' = 'inicio';
  public botonIluminadoId: number | null = null;
  public mensajeEstado: string = '¡Pulsa Comenzar para jugar!';

  private audioCtx: AudioContext | null = null;

  ngOnInit(): void {
    const recordGuardado = localStorage.getItem('familia_simon_record');
    if (recordGuardado) {
      this.recordPersonal = parseInt(recordGuardado, 10);
    }
  }

  // Inicializa el contexto de audio del navegador en la primera interacción
  private inicializarAudio(): void {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
  }

  // Reproducir tono melódico al pulsar o iluminar
  private reproducirTono(frecuencia: number): void {
    try {
      this.inicializarAudio();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frecuencia, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch {
      // Ignorar errores de audio si el navegador bloquea políticas de reproducción automática
    }
  }

  public iniciarJuego(): void {
    this.secuenciaMaquina = [];
    this.ronda = 0;
    this.estadoJuego = 'reproduciendo';
    this.siguienteRonda();
  }

  private siguienteRonda(): void {
    this.ronda++;
    this.secuenciaUsuario = [];
    this.mensajeEstado = `Nivel ${this.ronda}: ¡Atenta la familia!`;
    
    // Añadir un nuevo paso aleatorio (0 a 3)
    const nuevoPaso = Math.floor(Math.random() * 4);
    this.secuenciaMaquina.push(nuevoPaso);

    this.reproducirSecuenciaMaquina();
  }

  private async reproducirSecuenciaMaquina(): Promise<void> {
    this.estadoJuego = 'reproduciendo';

    // Pequeña pausa antes de empezar a mostrar
    await this.esperar(600);

    for (let i = 0; i < this.secuenciaMaquina.length; i++) {
      const idBoton = this.secuenciaMaquina[i];
      await this.iluminarBotonTemporalmente(idBoton, 450);
      await this.esperar(250); // Pausa entre destellos
    }

    this.estadoJuego = 'turno_usuario';
    this.mensajeEstado = '¡Tu turno! Repite la secuencia';
  }

  private iluminarBotonTemporalmente(id: number, duracion: number): Promise<void> {
    return new Promise(resolve => {
      this.botonIluminadoId = id;
      this.reproducirTono(this.botonesFamilia[id].sonidoFreq);

      setTimeout(() => {
        this.botonIluminadoId = null;
        resolve();
      }, duracion);
    });
  }

  private esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clic del usuario en uno de los 4 avatares
  public pulsarBoton(id: number): void {
    if (this.estadoJuego !== 'turno_usuario') return;

    // Feedback inmediato al pulsar
    this.reproducirTono(this.botonesFamilia[id].sonidoFreq);
    this.botonIluminadoId = id;
    setTimeout(() => { this.botonIluminadoId = null; }, 200);

    this.secuenciaUsuario.push(id);
    const indiceActual = this.secuenciaUsuario.length - 1;

    // Comprobar si el usuario ha fallado el paso
    if (this.secuenciaUsuario[indiceActual] !== this.secuenciaMaquina[indiceActual]) {
      this.gestionarGameOver();
      return;
    }

    // Comprobar si ha completado toda la secuencia de la ronda actual
    if (this.secuenciaUsuario.length === this.secuenciaMaquina.length) {
      this.estadoJuego = 'reproduciendo';
      this.mensajeEstado = '¡Bien hecho! Siguiente nivel...';

      if (this.ronda > this.recordPersonal) {
        this.recordPersonal = this.ronda;
        localStorage.setItem('familia_simon_record', this.recordPersonal.toString());
      }

      setTimeout(() => {
        this.siguienteRonda();
      }, 1000);
    }
  }

  private gestionarGameOver(): void {
    this.estadoJuego = 'game_over';
    this.mensajeEstado = `❌ ¡Fallaste en la ronda ${this.ronda}!`;
    this.reproducirTono(150.00); // Tono grave de error
  }
}