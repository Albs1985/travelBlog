export interface PersonajeFamiliar {
  id: string;
  nombre: string;
  rol: string;
  fotoUrl: string;
  alturaCm: number;
  pesoKg: number;
  velocidad: number;
  fuerzaSalto: number;
  vidasIniciales: number;
  colorRopa: string;
  colorBorde: string;
}

export interface Plataforma {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  tipo: 'suelo' | 'flotante' | 'obstaculo';
}

export interface Premio {
  x: number;
  y: number;
  recogido: boolean;
  valor: number;
}

export interface Enemigo {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  vx: number;
  limiteIzq: number;
  limiteDer: number;
  eliminado: boolean;
}

export interface RecordFamiliar {
  nombre: string;
  puntos: number;
  fecha: string;
}

export interface NivelConfig {
  numero: number;
  titulo: string;
  fondoFotoUrl: string;
  colorRespaldoCielo: string;
  anchoTotal: number;
  metaX: number;
  plataformas: Plataforma[];
  premios: Premio[];
  enemigos: Enemigo[];
}

export const PERSONAJES_FAMILIA: PersonajeFamiliar[] = [
  {
    id: 'albert',
    nombre: 'Albert',
    rol: 'El Explorador',
    fotoUrl: 'assets/images/perfiles/fotoPerfilAlbert.jpg',
    alturaCm: 180,
    pesoKg: 80,
    velocidad: 5.2,
    fuerzaSalto: -14.5,
    vidasIniciales: 4,
    colorRopa: '#4d7c0f', // Verde oliva como en su foto
    colorBorde: '#2b6cb0'
  },
  {
    id: 'alba',
    nombre: 'Alba',
    rol: 'La Estratega',
    fotoUrl: 'assets/images/perfiles/fotoPerfilAlba.jpg',
    alturaCm: 169,
    pesoKg: 58,
    velocidad: 5.6,
    fuerzaSalto: -14.2,
    vidasIniciales: 3,
    colorRopa: '#be185d',
    colorBorde: '#d53f8c'
  },
  {
    id: 'mateu',
    nombre: 'Mateu',
    rol: 'El Veloz',
    fotoUrl: 'assets/images/perfiles/fotoPerfilMateu.jpg',
    alturaCm: 140,
    pesoKg: 23,
    velocidad: 6.4,
    fuerzaSalto: -13.5,
    vidasIniciales: 3,
    colorRopa: '#e2e8f0',
    colorBorde: '#38a169'
  },
  {
    id: 'marina',
    nombre: 'Marina',
    rol: 'La Saltarina',
    fotoUrl: 'assets/images/perfiles/fotoPerfilMarina.jpg',
    alturaCm: 100,
    pesoKg: 13,
    velocidad: 5.0,
    fuerzaSalto: -13.0,
    vidasIniciales: 3,
    colorRopa: '#d69e2e',
    colorBorde: '#dd6b20'
  }
];

export function generarNivel(numero: number): NivelConfig {
  const configs: { [key: number]: { titulo: string; foto: string; color: string } } = {
    1: {
      titulo: 'Nivel 1: Ruta por la Montaña',
      foto: 'assets/images/2023/Portada2023.jpg', // Pon aquí tu foto de viaje 1
      color: '#bae6fd'
    },
    2: {
      titulo: 'Nivel 2: Paseo por la Costa',
      foto: 'assets/images/2023/Formentera4.jpg',   // Pon aquí tu foto de viaje 2
      color: '#fed7aa'
    },
    3: {
      titulo: 'Nivel 3: Gran Aventura Urbana',
      foto: 'assets/images/2019/Fanzara3.jpg',  // Pon aquí tu foto de viaje 3
      color: '#e9d5ff'
    }
  };


  const info = configs[numero] || configs[1];
  const anchoTotal = 9000;
  const plataformas: Plataforma[] = [];
  const premios: Premio[] = [];
  const enemigos: Enemigo[] = [];

  let cursorX = 0;
  while (cursorX < anchoTotal - 600) {
    const anchoTramo = 550 + ((cursorX * numero) % 350);
    plataformas.push({
      x: cursorX,
      y: 380,
      ancho: anchoTramo,
      alto: 70,
      tipo: 'suelo'
    });

    // Obstáculo fijo en tramos largos
    if (cursorX > 400 && anchoTramo > 680) {
      plataformas.push({
        x: cursorX + Math.floor(anchoTramo * 0.35),
        y: 340,
        ancho: 45,
        alto: 40,
        tipo: 'obstaculo'
      });
    }

    // Enemigo patrullando en cada tramo a partir del inicio
    if (cursorX > 300) {
      const inicioPatrulla = cursorX + 60;
      const finPatrulla = cursorX + anchoTramo - 60;
      if (finPatrulla - inicioPatrulla > 140) {
        enemigos.push({
          x: inicioPatrulla + 40,
          y: 348,
          ancho: 34,
          alto: 32,
          vx: (1.4 + numero * 0.4) * (cursorX % 2 === 0 ? 1 : -1),
          limiteIzq: inicioPatrulla,
          limiteDer: finPatrulla,
          eliminado: false
        });
      }
    }

    // Plataformas flotantes elevadas
    const platX = cursorX + 180;
    const platY = 250 - ((cursorX % 3) * 35);
    plataformas.push({
      x: platX,
      y: platY,
      ancho: 160,
      alto: 22,
      tipo: 'flotante'
    });

    // Monedas/premios
    premios.push({ x: platX + 40, y: platY - 30, recogido: false, valor: 10 });
    premios.push({ x: platX + 110, y: platY - 30, recogido: false, valor: 10 });
    premios.push({ x: cursorX + anchoTramo + 55, y: 290, recogido: false, valor: 25 });

    const hueco = cursorX === 0 ? 0 : 110 + (numero * 15);
    cursorX += anchoTramo + hueco;
  }

  // Plataforma final de meta
  plataformas.push({
    x: anchoTotal - 600,
    y: 380,
    ancho: 600,
    alto: 70,
    tipo: 'suelo'
  });

  return {
    numero,
    titulo: info.titulo,
    fondoFotoUrl: info.foto,
    colorRespaldoCielo: info.color,
    anchoTotal,
    metaX: anchoTotal - 200,
    plataformas,
    premios,
    enemigos
  };
}
