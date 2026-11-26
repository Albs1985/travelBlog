import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AutenticationService } from './autentication.service';
import { Viaje, ViajeResumen } from '../interfaces/viaje.interface';

export interface FotoParaSubir {
  /** Ej. "2027/canariasPrincipal.jpg", "2027/canarias1.jpg" o "Portada2027.jpg" */
  rutaRelativa: string;
  file: File;
}

export interface OpcionesCompresion {
  maxAncho?: number;
  maxAlto?: number;
  calidad?: number; // 0 a 1
}

interface EntradaTreeGitHub {
  path: string;
  mode: '100644';
  type: 'blob';
  content?: string;
  sha?: string;
}

@Injectable({ providedIn: 'root' })
export class GithubViajesService {
  private readonly owner = 'Albs1985';
  private readonly repo = 'travelBlog';
  private readonly branch = 'Nuevo-estilo-CSS';

  constructor(
    private http: HttpClient,
    private auth: AutenticationService
  ) {}

  private headers(): HttpHeaders {
    const token = this.auth.obtenerTokenGithub();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    });
  }

  private get apiBase(): string {
    return `https://api.github.com/repos/${this.owner}/${this.repo}`;
  }

  private base64ToUtf8(base64ConSaltos: string): string {
    const limpio = base64ConSaltos.replace(/\n/g, '');
    const binStr = atob(limpio);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  /**
   * Comprime una imagen en el navegador antes de subirla y devuelve Base64 puro
   * (sin el prefijo `data:image/jpeg;base64,`).
   */
  async comprimirImagenABase64(
    file: File,
    opts: OpcionesCompresion = { maxAncho: 1600, maxAlto: 1600, calidad: 0.78 }
  ): Promise<string> {
    const maxAncho = opts.maxAncho ?? 1600;
    const maxAlto = opts.maxAlto ?? 1600;
    const calidad = opts.calidad ?? 0.78;

    const bitmap = await createImageBitmap(file);
    try {
      let { width, height } = bitmap;

      if (width > maxAncho || height > maxAlto) {
        const ratio = Math.min(maxAncho / width, maxAlto / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No se pudo inicializar el contexto 2D para comprimir la imagen.');
      }

      ctx.drawImage(bitmap, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', calidad);
      const commaIdx = dataUrl.indexOf(',');
      return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    } finally {
      bitmap.close();
    }
  }

  private leerTextoSiExiste(path: string): Observable<{ contenido: string; sha: string } | undefined> {
    const url = `${this.apiBase}/contents/${path}?ref=${encodeURIComponent(this.branch)}`;
    return this.http.get<any>(url, { headers: this.headers() }).pipe(
      map((res) => ({
        contenido: this.base64ToUtf8(String(res?.content ?? '')),
        sha: String(res.sha),
      })),
      catchError((err) => {
        if (err?.status === 404) {
          return of(undefined);
        }
        return throwError(() => err);
      })
    );
  }

  private crearBlobBase64(base64: string, encoding: 'base64' | 'utf-8' = 'base64'): Observable<string> {
    return this.http
      .post<{ sha: string }>(
        `${this.apiBase}/git/blobs`,
        { content: base64, encoding },
        { headers: this.headers() }
      )
      .pipe(map((res) => res.sha));
  }

  publicarViaje(
    nuevoViaje: Viaje,
    ultimoViajeResumen: ViajeResumen | undefined,
    fotos: FotoParaSubir[],
    onProgreso?: (texto: string) => void
  ): Observable<void> {
    if (!this.auth.obtenerTokenGithub()) {
      return throwError(() => new Error('No hay token de GitHub configurado.'));
    }

    const nombreArchivo = `${nuevoViaje.archivo}.json`;
    const jsonNuevo = JSON.stringify(nuevoViaje, null, 2);

    onProgreso?.(`Obteniendo estado actual de la rama ${this.branch}...`);

    const refUrl = `${this.apiBase}/git/refs/heads/${encodeURIComponent(this.branch)}`;

    return this.http.get<any>(refUrl, { headers: this.headers() }).pipe(
      switchMap((refData) => {
        const ultimoCommitSha: string = refData?.object?.sha;
        if (!ultimoCommitSha) {
          return throwError(() => new Error(`No se pudo obtener el SHA del último commit en ${this.branch}.`));
        }

        return this.http
          .get<any>(`${this.apiBase}/git/commits/${ultimoCommitSha}`, { headers: this.headers() })
          .pipe(
            switchMap((commitData) => {
              const baseTreeSha: string = commitData?.tree?.sha;
              if (!baseTreeSha) {
                return throwError(() => new Error('No se pudo obtener el árbol base del commit.'));
              }

              const rutasAnteriores = ultimoViajeResumen
                ? [
                    `src/assets/data/viajes/${ultimoViajeResumen.archivo}.json`,
                    `docs/assets/data/viajes/${ultimoViajeResumen.archivo}.json`,
                  ]
                : [];

              const lecturasAnteriores$ = rutasAnteriores.length
                ? forkJoin(
                    rutasAnteriores.map((ruta) =>
                      this.leerTextoSiExiste(ruta).pipe(map((dato) => ({ ruta, dato })))
                    )
                  )
                : of([] as Array<{ ruta: string; dato: { contenido: string; sha: string } | undefined }>);

              return lecturasAnteriores$.pipe(
                switchMap((anterioresLeidos) => {
                  const entradasTree: EntradaTreeGitHub[] = [];

                  for (const item of anterioresLeidos) {
                    if (item.dato) {
                      const objAnterior: Viaje = JSON.parse(item.dato.contenido);
                      objAnterior.siguiente = nuevoViaje.id;
                      const jsonAntActualizado = JSON.stringify(objAnterior, null, 2);

                      entradasTree.push({
                        path: item.ruta,
                        mode: '100644',
                        type: 'blob',
                        content: jsonAntActualizado,
                      });
                    }
                  }

                  entradasTree.push(
                    {
                      path: `src/assets/data/viajes/${nombreArchivo}`,
                      mode: '100644',
                      type: 'blob',
                      content: jsonNuevo,
                    },
                    {
                      path: `docs/assets/data/viajes/${nombreArchivo}`,
                      mode: '100644',
                      type: 'blob',
                      content: jsonNuevo,
                    }
                  );

                  onProgreso?.(`Comprimiendo ${fotos.length} foto(s) y preparando subida...`);

                  const tareasFotos$ = fotos.map((foto, idx) =>
                    from(this.comprimirImagenABase64(foto.file)).pipe(
                      switchMap((base64Comprimido) => {
                        onProgreso?.(
                          `Subiendo blob de foto ${idx + 1}/${fotos.length}: ${foto.rutaRelativa}...`
                        );
                        return this.crearBlobBase64(base64Comprimido, 'base64').pipe(
                          map((blobSha) => ({ rutaRelativa: foto.rutaRelativa, blobSha }))
                        );
                      })
                    )
                  );

                  const blobsFotos$= tareasFotos$.length
                    ? forkJoin(tareasFotos$)
                    : of([] as Array<{ rutaRelativa: string; blobSha: string }>);

                  return blobsFotos$.pipe(
                    switchMap((blobsSubidos) => {
                      for (const b of blobsSubidos) {
                        entradasTree.push(
                          {
                            path: `src/assets/images/${b.rutaRelativa}`,
                            mode: '100644',
                            type: 'blob',
                            sha: b.blobSha,
                          },
                          {
                            path: `docs/assets/images/${b.rutaRelativa}`,
                            mode: '100644',
                            type: 'blob',
                            sha: b.blobSha,
                          }
                        );
                      }

                      onProgreso?.(`Creando commit atómico en ${this.branch}...`);

                      return this.http
                        .post<{ sha: string }>(
                          `${this.apiBase}/git/trees`,
                          {
                            base_tree: baseTreeSha,
                            tree: entradasTree,
                          },
                          { headers: this.headers() }
                        )
                        .pipe(
                          switchMap((nuevoTree) =>
                            this.http.post<{ sha: string }>(
                              `${this.apiBase}/git/commits`,
                              {
                                message: `Añadir viaje ${nombreArchivo} y enlazar siguiente`,
                                tree: nuevoTree.sha,
                                parents: [ultimoCommitSha],
                              },
                              { headers: this.headers() }
                            )
                          ),
                          switchMap((nuevoCommit) =>
                            this.http
                              .patch(
                                refUrl,
                                {
                                  sha: nuevoCommit.sha,
                                  force: false,
                                },
                                { headers: this.headers() }
                              )
                              .pipe(map(() => void 0))
                          )
                        );
                    })
                  );
                })
              );
            })
          );
      })
    );
  }
}
