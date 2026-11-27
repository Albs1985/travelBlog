import fs from 'node:fs/promises';
import webpush from 'web-push';

const tipo = process.env.TIPO_NOVEDAD || 'fotos';
const titulo = process.env.TITULO_NOVEDAD || 'Novedad familiar';
const rutaDocs = 'docs/assets/push-subscriptions.json';
const rutaSrc = 'src/assets/push-subscriptions.json';

const configTipo = {
  frase: {
    etiqueta: 'Nueva frase',
    cuerpo: 'Se han subido nuevas frases.',
    ruta: '/frases'
  },
  fotos: {
    etiqueta: 'Nuevas fotos',
    cuerpo: 'Se han subido nuevas fotos familiares.',
    ruta: '/fotos'
  },
  dibujo: {
    etiqueta: 'Nuevo dibujo',
    cuerpo: 'Se ha añadido un nuevo dibujo.',
    ruta: '/dibujos'
  },
  favorito: {
    etiqueta: 'Nuevo favorito',
    cuerpo: 'Se ha añadido una nueva foto favorita.',
    ruta: '/favoritos'
  },
  viaje: {
    etiqueta: 'Nuevo viaje',
    cuerpo: 'Se ha añadido un nuevo viaje al diario.',
    ruta: '/viajes'
  },
  relato: {
    etiqueta: 'Nuevo relato',
    cuerpo: 'Hay un nuevo relato disponible para leer.',
    ruta: '/relatos'
  }
};

const cfg = configTipo[tipo] || configTipo.fotos;

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const raw = await fs.readFile(rutaDocs, 'utf8');
const parsed = JSON.parse(raw);
const lista = Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [];

const payload = JSON.stringify({
  notification: {
    title: `${cfg.etiqueta}: ${titulo}`,
    body: cfg.cuerpo,
    icon: 'assets/icons/icon-192x192.png',
    badge: 'assets/icons/icon-72x72.png',
    data: {
      tipo,
      ruta: cfg.ruta,
      onActionClick: {
        default: {
          operation: 'openWindow',
          url: `./#${cfg.ruta}`
        }
      }
    }
  }
});

const activas = [];
for (const item of lista) {
  try {
    await webpush.sendNotification(item.subscription, payload);
    activas.push(item);
    console.log(`Enviado a: ${item.nombre || item.id}`);
  } catch (err) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      console.log(`Eliminando suscripción caducada (${err.statusCode}): ${item.nombre || item.id}`);
    } else {
      console.error(`Error enviando a ${item.nombre || item.id}:`, err);
      activas.push(item);
    }
  }
}

if (activas.length !== lista.length) {
  const contenidoLimpio = JSON.stringify({ subscriptions: activas }, null, 2) + '\n';
  await Promise.all([
    fs.writeFile(rutaDocs, contenidoLimpio, 'utf8'),
    fs.writeFile(rutaSrc, contenidoLimpio, 'utf8')
  ]);
  console.log('Archivos de suscripciones actualizados en docs/ y src/.');
}
