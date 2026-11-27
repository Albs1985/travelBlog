import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';

export type TipoNovedadPush = 'frase' | 'fotos' | 'dibujo' | 'favorito' | 'viaje' | 'relato';

interface DispositivoSuscrito {
  id: string;
  nombre: string;
  actualizadoEn: string;
  subscription: PushSubscriptionJSON;
}

interface ArchivoSuscripciones {
  subscriptions: DispositivoSuscrito[];
}

@Injectable({ providedIn: 'root' })
export class NotificationPushService {
  private http = inject(HttpClient);
  private swPush = inject(SwPush);
  private router = inject(Router);

  private readonly owner = 'Albs1985';
  private readonly repo = 'travelBlog';
  private readonly workflowFile = 'notificar-familia.yml';
  private readonly vapidPublicKey =
    'BONMFtj1iDUFVQ4NtHzsSuP0InUeR7gH7ikx6r3TY99bGAiP-EU2sDxAs2o7stWvWYye8y9c6GgooEBoRTNj8ok';
  private readonly rama = 'main';
  private readonly rutaArchivo = 'docs/assets/push-subscriptions.json';

  dispararNotificacion(token: string, tipo: TipoNovedadPush, titulo: string) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/workflows/${this.workflowFile}/dispatches`;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    });

    const body = {
      ref: this.rama,
      inputs: {
        tipo,
        titulo,
      },
    };

    return this.http.post(url, body, { headers });
  }

  async registrarDispositivo(tokenGithub: string, nombreDispositivo: string): Promise<void> {
    if (!this.swPush.isEnabled) {
      throw new Error('Service Worker no habilitado en este contexto.');
    }

    const sub = await this.swPush.requestSubscription({
      serverPublicKey: this.vapidPublicKey,
    });
    const subJson = sub.toJSON();

    const idGenerado = btoa(
      unescape(encodeURIComponent(subJson.endpoint || Date.now().toString()))
    )
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 16);

    const nuevoRegistro: DispositivoSuscrito = {
      id: idGenerado,
      nombre: nombreDispositivo,
      actualizadoEn: new Date().toISOString(),
      subscription: subJson,
    };

    const operacion = (data: ArchivoSuscripciones): ArchivoSuscripciones => {
      const lista = Array.isArray(data?.subscriptions) ? [...data.subscriptions] : [];
      const idx = lista.findIndex(
        (item) => item.subscription?.endpoint === subJson.endpoint
      );

      if (idx >= 0) {
        lista[idx] = nuevoRegistro;
      } else {
        lista.push(nuevoRegistro);
      }

      return { subscriptions: lista };
    };

    const rutas = [
      { path: 'src/assets/push-subscriptions.json', sufijo: 'Origen' },
      { path: 'docs/assets/push-subscriptions.json', sufijo: 'Docs' },
    ];

    for (const ruta of rutas) {
      await this.actualizarJsonSuscripcionesEnGitHub(
        tokenGithub,
        ruta.path,
        `chore(push): registrar dispositivo ${nombreDispositivo} (${ruta.sufijo})`,
        operacion
      );
    }
  }

  private async actualizarJsonSuscripcionesEnGitHub(
    tokenGithub: string,
    filePath: string,
    mensajeCommit: string,
    operacion: (data: ArchivoSuscripciones) => ArchivoSuscripciones
  ): Promise<void> {
    const apiUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${filePath}`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${tokenGithub}`,
      Accept: 'application/vnd.github+json',
    });

    const archivoRemoto = await firstValueFrom(
      this.http.get<{ content: string; sha: string }>(`${apiUrl}?ref=${this.rama}`, { headers })
    );

    const decoded = decodeURIComponent(escape(atob(archivoRemoto.content.replace(/\n/g, ''))));
    const dataActual: ArchivoSuscripciones = JSON.parse(decoded) || { subscriptions: [] };
    const dataActualizada = operacion(dataActual);

    const jsonString = JSON.stringify(dataActualizada, null, 2) + '\n';
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    await firstValueFrom(
      this.http.put(
        apiUrl,
        {
          message: mensajeCommit,
          content: base64Content,
          sha: archivoRemoto.sha,
          branch: this.rama,
        },
        { headers }
      )
    );
  }

  iniciar(): void {
    if (!this.swPush.isEnabled) return;

    this.swPush.messages.subscribe((payload: any) => {
      console.log('Push recibido en app:', payload);
    });

    this.swPush.notificationClicks.subscribe(({ notification }) => {
      const ruta = notification?.data?.ruta;
      if (ruta) {
        this.router.navigateByUrl(ruta);
      }
    });
  }
}
