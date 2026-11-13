import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface JugadorPartida {
  id: string;
  nombre: string;
  avatar: string;
  esImpostor: boolean;
  rolSecreto?: string;
  palabraTabu?: string;
  visto: boolean;
}

export interface SituacionFamiliar {
  lugar: string;
  categoria: string;
  tabues: string[];
}

@Component({
  selector: 'app-impostor',
  templateUrl: './impostor.component.html',
  styleUrls: ['./impostor.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ImpostorComponent {

  // Perfiles base de la familia (puedes mantenerlos fijos para los principales)
  public perfilesBase = [
    { nombre: 'Albert', avatar: 'assets/images/perfiles/fotoPerfilAlbert.jpg' },
    { nombre: 'Alba', avatar: 'assets/images/perfiles/fotoPerfilAlba.jpg' },
    { nombre: 'Mateu', avatar: 'assets/images/perfiles/fotoPerfilMateu.jpg' },
    { nombre: 'Marina', avatar: 'assets/images/perfiles/fotoPerfilMarina.jpg' }
  ];

  public situacionesSecretas: SituacionFamiliar[] = [
    { lugar: 'La cena de Nochebuena', categoria: 'Navidad', tabues: ['Gambas', 'Cuñados', 'Turrón'] },
    { lugar: 'La cabalgata de Reyes con los críos', categoria: 'Navidad', tabues: ['Caramelos', 'Carroza', 'Fila'] },
    { lugar: 'Abriendo los regalos el día de Navidad', categoria: 'Navidad', tabues: ['Papel', 'Papá Noel', 'Sorpresa'] },
    { lugar: 'La comida de Año Nuevo con los cuñados', categoria: 'Navidad', tabues: ['Resaca', 'Sobremesa', 'Champán'] },
    { lugar: 'Cantando villancicos con un par de copas de más', categoria: 'Navidad', tabues: ['Zambomba', 'Pandereta', 'Afinado'] },
    { lugar: 'Comiendo uvas a velocidad extrema en Nochevieja', categoria: 'Navidad', tabues: ['Atragantarse', 'Campanadas', 'Televisión'] },
    { lugar: 'Las vacaciones en el pueblo', categoria: 'Verano', tabues: ['Mosquitos', 'Siesta', 'Calor'] },
    { lugar: 'Buscando sitio para aparcar en la playa', categoria: 'Viajes', tabues: ['Arena', 'Coche', 'Sol'] },
    { lugar: 'El camping con los mosquitos y la tienda de campaña', categoria: 'Verano', tabues: ['Piquetas', 'Saco', 'Linterna'] },
    { lugar: 'Intentando doblar la sombrilla de playa sin romperla', categoria: 'Verano', tabues: ['Viento', 'Varilla', 'Funda'] },
    { lugar: 'Luchando contra la horda de guiris en el buffet libre', categoria: 'Viajes', tabues: ['Plato', 'Cola', 'Desayuno'] },
    { lugar: 'Perdidos en una ciudad extranjera sin roaming', categoria: 'Viajes', tabues: ['Mapa', 'Google', 'Idioma'] },
    { lugar: 'Haciendo escala de 6 horas en el aeropuerto', categoria: 'Viajes', tabues: ['Terminal', 'Café', 'Maleta'] },
    { lugar: 'Montando las maletas en el maletero como un Tetris', categoria: 'Viajes', tabues: ['Bolsas', 'Cierre', 'Espacio'] },
    { lugar: 'Comiendo la paella del domingo', categoria: 'Comidas', tabues: ['Arroz', 'Socarrat', 'Domingo'] },
    { lugar: 'Barbacoa familiar en el jardín', categoria: 'Comidas', tabues: ['Carne', 'Fuego', 'Humo'] },
    { lugar: 'La eterna sobremesa que se junta con la merienda', categoria: 'Comidas', tabues: ['Café', 'Silla', 'Charlar'] },
    { lugar: 'Discutiendo sobre quién hace la mejor tortilla de patatas', categoria: 'Comidas', tabues: ['Cebolla', 'Huevo', 'Patata'] },
    { lugar: 'Asaltando la nevera a las 3 de la mañana', categoria: 'Comidas', tabues: ['Luz', 'Frio', 'Sobra'] },
    { lugar: 'El tupperware gigante que te da la abuela para una semana', categoria: 'Comidas', tabues: ['Plástico', 'Congelador', 'Comida'] },
    { lugar: 'Cocinando unas croquetas caseras para todo el batallón', categoria: 'Comidas', tabues: ['Bechamel', 'Freír', 'Harina'] },
    { lugar: 'Montando los muebles de IKEA', categoria: 'Casa', tabues: ['Llave', 'Instrucciones', 'Tornillo'] },
    { lugar: 'El grupo de WhatsApp familiar echando humo', categoria: 'Tecnología', tabues: ['Notificación', 'Audio', 'Sticker'] },
    { lugar: 'Buscando el mando de la tele entre los cojines del sofá', categoria: 'Casa', tabues: ['Pilas', 'Canal', 'Sofá'] },
    { lugar: 'Poniendo la lavadora con una ropa roja que tiñe todo', categoria: 'Casa', tabues: ['Rosa', 'Programa', 'Colada'] },
    { lugar: 'Peleándose con el router porque no llega el WiFi', categoria: 'Tecnología', tabues: ['Cable', 'Reiniciar', 'Luz'] },
    { lugar: 'Colgando un cuadro y dando un martillazo en la pared', categoria: 'Casa', tabues: ['Clavo', 'Pared', 'Agujero'] },
    { lugar: 'La gran limpieza de primavera en toda la casa', categoria: 'Casa', tabues: ['Aspiradora', 'Polvo', 'Trapo'] },
    { lugar: 'Esperando en urgencias a medianoche', categoria: 'Emergencias', tabues: ['Camilla', 'Doctor', 'Espera'] },
    { lugar: 'Llegando tarde a una boda porque no encontrabas los zapatos', categoria: 'Celebraciones', tabues: ['Traje', 'Reloj', 'Iglesia'] },
    { lugar: 'Fiesta sorpresa de cumpleaños', categoria: 'Celebraciones', tabues: ['Tarta', 'Velas', 'Silencio'] },
    { lugar: 'El día de la comunión del sobrino con sesión de fotos', categoria: 'Celebraciones', tabues: ['Traje', 'Cámara', 'Iglesia'] },
    { lugar: 'Yendo a matricular a los niños al colegio en septiembre', categoria: 'Colegio', tabues: ['Libros', 'Matrícula', 'Colegio'] },
    { lugar: 'Soportando la reunión de vecinos de la comunidad', categoria: 'Comunidad', tabues: ['Ascensor', 'Presidente', 'Derrama'] },
    { lugar: 'En la peluquería probando un tinte que salió mal', categoria: 'Estética', tabues: ['Tijeras', 'Espejo', 'Pelo'] }
  ];

  public jugadoresConfig: { nombre: string; avatar: string }[] = [
    { nombre: 'Albert', avatar: 'assets/images/perfiles/fotoPerfilAlbert.jpg' },
    { nombre: 'Alba', avatar: 'assets/images/perfiles/fotoPerfilAlba.jpg' },
    { nombre: 'Mateu', avatar: 'assets/images/perfiles/fotoPerfilMateu.jpg' },
    { nombre: 'Marina', avatar: 'assets/images/perfiles/fotoPerfilMarina.jpg' }
  ];
  public nuevoNombreInput: string = '';
  public nivelDificultad: 'normal' | 'avanzado' = 'normal';

  public juegoIniciado: boolean = false;
  public faseEntrega: 'esperando_toque' | 'viendo_secreto' | 'ronda_activa' | 'revelacion' = 'esperando_toque';

  public listaJugadoresPartida: JugadorPartida[] = [];
  public indiceJugadorActual: number = 0;
  public situacionPartida: string = '';
  public palabrasTabuPartida: string[] = [];
  public impostorDescubierto: JugadorPartida | null = null;

  // NUEVO MÉTODO AGREGAR JUGADOR CON DICEBEAR
  public agregarJugador(): void {
    const nombreLimpio = this.nuevoNombreInput.trim();
    if (!nombreLimpio) return;

    // Estilo de DiceBear (puedes probar 'lorelei', 'adventurer', 'avataaars', 'bottts', etc.)
    const estilo = 'lorelei';
    const urlAvatar = `https://api.dicebear.com/7.x/${estilo}/svg?seed=${encodeURIComponent(nombreLimpio)}`;

    this.jugadoresConfig.push({
      nombre: nombreLimpio,
      avatar: urlAvatar
    });

    this.nuevoNombreInput = '';
  }

  public eliminarJugadorConfig(index: number): void {
    if (this.jugadoresConfig.length > 3) {
      this.jugadoresConfig.splice(index, 1);
    } else {
      alert('¡Se necesitan al menos 3 jugadores para jugar a El Intruso!');
    }
  }

  public iniciarPartida(): void {
    if (this.jugadoresConfig.length < 3) return;

    const sitAleatoria = this.situacionesSecretas[Math.floor(Math.random() * this.situacionesSecretas.length)];
    this.situacionPartida = sitAleatoria.lugar;

    if (this.nivelDificultad === 'avanzado') {
      this.palabrasTabuPartida = sitAleatoria.tabues;
    } else {
      this.palabrasTabuPartida = [];
    }

    const indexImpostor = Math.floor(Math.random() * this.jugadoresConfig.length);

    this.listaJugadoresPartida = this.jugadoresConfig.map((j, idx) => ({
      id: `j_${idx}`,
      nombre: j.nombre,
      avatar: j.avatar,
      esImpostor: idx === indexImpostor,
      visto: false
    }));

    this.indiceJugadorActual = 0;
    this.juegoIniciado = true;
    this.faseEntrega = 'esperando_toque';
    this.impostorDescubierto = null;
  }

  public revelarSecreto(): void {
    this.faseEntrega = 'viendo_secreto';
  }

  public siguienteJugador(): void {
    this.listaJugadoresPartida[this.indiceJugadorActual].visto = true;

    if (this.indiceJugadorActual < this.listaJugadoresPartida.length - 1) {
      this.indiceJugadorActual++;
      this.faseEntrega = 'esperando_toque';
    } else {
      this.faseEntrega = 'ronda_activa';
    }
  }

  public finalizarRevelandoImpostor(): void {
    this.impostorDescubierto = this.listaJugadoresPartida.find(j => j.esImpostor) || null;
    this.faseEntrega = 'revelacion';
  }

  public reiniciarConfiguracion(): void {
    this.juegoIniciado = false;
    this.faseEntrega = 'esperando_toque';
  }
}
