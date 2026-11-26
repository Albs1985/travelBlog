import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AutenticationService } from './autentication.service';
import { IndiceViajes, Viaje, ViajeResumen } from '../interfaces/viaje.interface';

export interface FotoParaSubir {
  /** Ej. "2027/canariasPrincipal.jpg", "2027/canarias1.jpg" o "2027/Portada2027.jpg" */
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
  sha?: string | null
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

  /** Extrae los campos ligeros de `ViajeResumen` para insertar en `index.json`. */
  private construirResumenViaje(viaje: Viaje): ViajeResumen {
    return {
      id: viaje.id,
      archivo: viaje.archivo,
      anyo: viaje.anyo,
      fechaInicio: viaje.fechaInicio,
      fechaFin: viaje.fechaFin,
      diaInicio: viaje.diaInicio,
      mesInicio: viaje.mesInicio,
      diaFin: viaje.diaFin,
      mesFin: viaje.mesFin,
      destino: viaje.destino,
      categoria: viaje.categoria,
      provincia: viaje.provincia,
      pais: viaje.pais,
      precio: viaje.precio,
      estancia: viaje.estancia,
      tipoEstancia: viaje.tipoEstancia,
      transporte: [...viaje.transporte],
      personas: [...viaje.personas],
      portada: viaje.portada,
      fotos: [...viaje.fotos],
      numFotos: viaje.numFotos,
      anterior: viaje.anterior,
      siguiente: viaje.siguiente,
    };
  }

  /** Actualiza `anyos` (si el año es nuevo) y `viajes` (enlazando `siguiente` del anterior y añadiendo el nuevo). */
  private actualizarContenidoIndice(indiceActual: IndiceViajes, nuevoViaje: Viaje): IndiceViajes {
    const anyos = [...(indiceActual.anyos ?? [])];
    const viajes = [...(indiceActual.viajes ?? [])];

    // 1. Si el año no existe en `anyos`, lo añadimos al principio (ordenado de más reciente a más antiguo)
    if (!anyos.some((a) => Number(a.anyo) === Number(nuevoViaje.anyo))) {
      anyos.push({
        anyo: Number(nuevoViaje.anyo),
        portada: `${nuevoViaje.anyo}/Portada${nuevoViaje.anyo}.jpg`,
      });
      anyos.sort((a, b) => Number(b.anyo) - Number(a.anyo));
    }

    // 2. Actualizar `siguiente` del viaje anterior en el listado
    if (nuevoViaje.anterior) {
      const idxAnterior = viajes.findIndex((v) => v.id === nuevoViaje.anterior);
      if (idxAnterior >= 0) {
        viajes[idxAnterior] = {
          ...viajes[idxAnterior],
          siguiente: nuevoViaje.id,
        };
      }
    } else if (viajes.length > 0) {
      const ultimoIdx = viajes.length - 1;
      viajes[ultimoIdx] = {
        ...viajes[ultimoIdx],
        siguiente: nuevoViaje.id,
      };
    }

    // 3. Añadir o reemplazar el resumen del nuevo viaje
    const resumenNuevo = this.construirResumenViaje(nuevoViaje);
    const idxExistente = viajes.findIndex((v) => v.id === nuevoViaje.id);
    if (idxExistente >= 0) {
      viajes[idxExistente] = resumenNuevo;
    } else {
      viajes.push(resumenNuevo);
    }

    return { anyos, viajes };
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

              const rutasIndice = [
                'src/assets/data/index.json',
                'docs/assets/data/index.json',
              ];

              const lecturas$ = forkJoin({
                anteriores: rutasAnteriores.length
                  ? forkJoin(
                      rutasAnteriores.map((ruta) =>
                        this.leerTextoSiExiste(ruta).pipe(map((dato) => ({ ruta, dato })))
                      )
                    )
                  : of([] as Array<{ ruta: string; dato: { contenido: string; sha: string } | undefined }>),
                indices: forkJoin(
                  rutasIndice.map((ruta) =>
                    this.leerTextoSiExiste(ruta).pipe(map((dato) => ({ ruta, dato })))
                  )
                ),
              });

              return lecturas$.pipe(
                switchMap(({ anteriores, indices }) => {
                  const entradasTree: EntradaTreeGitHub[] = [];

                  // 1. Actualizar `siguiente` en el JSON del viaje anterior
                  for (const item of anteriores) {
                    if (item.dato) {
                      const objAnterior: Viaje = JSON.parse(item.dato.contenido);
                      objAnterior.siguiente = nuevoViaje.id;
                      entradasTree.push({
                        path: item.ruta,
                        mode: '100644',
                        type: 'blob',
                        content: JSON.stringify(objAnterior, null, 2),
                      });
                    }
                  }

                  // 2. Actualizar `src/assets/data/index.json` y `docs/assets/data/index.json`
                  for (const ind of indices) {
                    if (ind.dato) {
                      const indiceObj: IndiceViajes = JSON.parse(ind.dato.contenido);
                      const indiceActualizado = this.actualizarContenidoIndice(indiceObj, nuevoViaje);
                      entradasTree.push({
                        path: ind.ruta,
                        mode: '100644',
                        type: 'blob',
                        content: JSON.stringify(indiceActualizado, null, 2),
                      });
                    }
                  }

                  // 3. Añadir el JSON del viaje nuevo en `src` y `docs`
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

                  // 4. Comprimir y subir fotos como blobs
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

                  const blobsFotos$ = tareasFotos$.length
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
                                message: `Añadir viaje ${nombreArchivo}, actualizar index.json y enlazar siguiente`,
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


  /**
   * Elimina un viaje en una única transacción atómica sobre `this.branch`:
   * 1. Borra `src/assets/data/viajes/{archivo}.json` y `docs/assets/data/viajes/{archivo}.json`.
   * 2. Reenlaza `anterior.siguiente` y `siguiente.anterior` si existen.
   * 3. Quita el viaje de `index.json` (`src` y `docs`) y, si el año se queda sin viajes, quita el año de `anyos`.
   * 4. Borra las imágenes propias del viaje (portada, `fotos` y `fotosExtra`) en `src/` y `docs/`.
   */
  eliminarViaje(viaje: Viaje): Observable<void> {
    if (!this.auth.obtenerTokenGithub()) {
      return throwError(() => new Error('No hay token de GitHub configurado.'));
    }

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

              const rutasIndice = ['src/assets/data/index.json', 'docs/assets/data/index.json'];

              return forkJoin(
                rutasIndice.map((ruta) => this.leerTextoSiExiste(ruta).pipe(map((dato) => ({ ruta, dato }))))
              ).pipe(
                switchMap((indicesLeidos) => {
                  const indiceBase: IndiceViajes | undefined = indicesLeidos.find((i) => i.dato)?.dato
                    ? JSON.parse(indicesLeidos.find((i) => i.dato)!.dato!.contenido)
                    : undefined;

                  const listaViajes = indiceBase?.viajes ?? [];
                  const idxActual = listaViajes.findIndex(
                    (v) => v.id === viaje.id || v.archivo === viaje.archivo
                  );

                  const idAnterior =
                    viaje.anterior || (idxActual > 0 ? listaViajes[idxActual - 1]?.id : '');
                  const idSiguiente =
                    viaje.siguiente ||
                    (idxActual >= 0 && idxActual < listaViajes.length - 1
                      ? listaViajes[idxActual + 1]?.id
                      : '');

                  const resumenAnterior = listaViajes.find((v) => v.id === idAnterior);
                  const resumenSiguiente = listaViajes.find((v) => v.id === idSiguiente);

                  const rutasVecinos: string[] = [];
                  if (resumenAnterior?.archivo) {
                    rutasVecinos.push(
                      `src/assets/data/viajes/${resumenAnterior.archivo}.json`,
                      `docs/assets/data/viajes/${resumenAnterior.archivo}.json`
                    );
                  }
                  if (resumenSiguiente?.archivo) {
                    rutasVecinos.push(
                      `src/assets/data/viajes/${resumenSiguiente.archivo}.json`,
                      `docs/assets/data/viajes/${resumenSiguiente.archivo}.json`
                    );
                  }

                  const lecturasVecinos$ = rutasVecinos.length
                    ? forkJoin(
                        rutasVecinos.map((ruta) =>
                          this.leerTextoSiExiste(ruta).pipe(map((dato) => ({ ruta, dato })))
                        )
                      )
                    : of([] as Array<{ ruta: string; dato: { contenido: string; sha: string } | undefined }>);

                  return lecturasVecinos$.pipe(
                    switchMap((vecinosLeidos) => {
                      const entradasTree: Array<{
                        path: string;
                        mode: '100644';
                        type: 'blob';
                        content?: string;
                        sha?: string | null;
                      }> = [];

                      // 1. Reenlazar anterior y siguiente en sus JSON individuales
                      for (const item of vecinosLeidos) {
                        if (!item.dato) continue;
                        const obj: Viaje = JSON.parse(item.dato.contenido);
                        if (resumenAnterior && obj.id === resumenAnterior.id) {
                          obj.siguiente = idSiguiente || '';
                          entradasTree.push({
                            path: item.ruta,
                            mode: '100644',
                            type: 'blob',
                            content: JSON.stringify(obj, null, 2),
                          });
                        } else if (resumenSiguiente && obj.id === resumenSiguiente.id) {
                          obj.anterior = idAnterior || '';
                          entradasTree.push({
                            path: item.ruta,
                            mode: '100644',
                            type: 'blob',
                            content: JSON.stringify(obj, null, 2),
                          });
                        }
                      }

                      // 2. Actualizar index.json en src y docs
                      for (const ind of indicesLeidos) {
                        if (!ind.dato) continue;
                        const indObj: IndiceViajes = JSON.parse(ind.dato.contenido);
                        const viajesFiltrados = (indObj.viajes ?? [])
                          .filter((v) => v.id !== viaje.id && v.archivo !== viaje.archivo)
                          .map((v) => {
                            if (idAnterior && v.id === idAnterior) {
                              return { ...v, siguiente: idSiguiente || '' };
                            }
                            if (idSiguiente && v.id === idSiguiente) {
                              return { ...v, anterior: idAnterior || '' };
                            }
                            return v;
                          });

                        const sigueHabiendoViajesDelAnyo = viajesFiltrados.some(
                          (v) => Number(v.anyo) === Number(viaje.anyo)
                        );
                        const anyosFiltrados = sigueHabiendoViajesDelAnyo
                          ? indObj.anyos ?? []
                          : (indObj.anyos ?? []).filter((a) => Number(a.anyo) !== Number(viaje.anyo));

                        entradasTree.push({
                          path: ind.ruta,
                          mode: '100644',
                          type: 'blob',
                          content: JSON.stringify({ anyos: anyosFiltrados, viajes: viajesFiltrados }, null, 2),
                        });
                      }

                      // 3. Eliminar JSON del viaje en src y docs
                      const archivoViaje = viaje.archivo || viaje.id;
                      entradasTree.push(
                        {
                          path: `src/assets/data/viajes/${archivoViaje}.json`,
                          mode: '100644',
                          type: 'blob',
                          sha: null,
                        },
                        {
                          path: `docs/assets/data/viajes/${archivoViaje}.json`,
                          mode: '100644',
                          type: 'blob',
                          sha: null,
                        }
                      );

                      // 4. Eliminar imágenes del viaje en src y docs
                      const rutasImagenes = Array.from(
                        new Set(
                          [
                            viaje.portada,
                            ...(viaje.fotos ?? []),
                            ...(viaje.fotosExtra ?? []),
                          ].filter((r): r is string => !!r && r.trim() !== '')
                        )
                      );

                      for (const imgRel of rutasImagenes) {
                        entradasTree.push(
                          {
                            path: `src/assets/images/${imgRel}`,
                            mode: '100644',
                            type: 'blob',
                            sha: null,
                          },
                          {
                            path: `docs/assets/images/${imgRel}`,
                            mode: '100644',
                            type: 'blob',
                            sha: null,
                          }
                        );
                      }

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
                                message: `Eliminar viaje ${archivoViaje}.json y actualizar enlaces/índice`,
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

  guardarEdicionViaje(
    viajeEditado: Viaje,
    fotos: FotoParaSubir[],
    onProgreso?: (texto: string) => void
  ): Observable<void> {
    if (!this.auth.obtenerTokenGithub()) {
      return throwError(() => new Error('No hay token de GitHub configurado.'));
    }

    const nombreArchivo = `${viajeEditado.archivo}.json`;
    const jsonEditado = JSON.stringify(viajeEditado, null, 2);
    const refUrl = `${this.apiBase}/git/refs/heads/${encodeURIComponent(this.branch)}`;

    onProgreso?.(`Obteniendo estado actual de la rama ${this.branch}...`);

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

              const rutasIndice = ['src/assets/data/index.json', 'docs/assets/data/index.json'];

              return forkJoin(
                rutasIndice.map((ruta) => this.leerTextoSiExiste(ruta).pipe(map((dato) => ({ ruta, dato }))))
              ).pipe(
                switchMap((indicesLeidos) => {
                  const entradasTree: EntradaTreeGitHub[] = [
                    {
                      path: `src/assets/data/viajes/${nombreArchivo}`,
                      mode: '100644',
                      type: 'blob',
                      content: jsonEditado,
                    },
                    {
                      path: `docs/assets/data/viajes/${nombreArchivo}`,
                      mode: '100644',
                      type: 'blob',
                      content: jsonEditado,
                    },
                  ];

                  const resumenEditado = this.construirResumenViaje(viajeEditado);

                  for (const ind of indicesLeidos) {
                    if (ind.dato) {
                      const indiceObj: IndiceViajes = JSON.parse(ind.dato.contenido);
                      const anyos = [...(indiceObj.anyos ?? [])];
                      if (!anyos.some((a) => Number(a.anyo) === Number(viajeEditado.anyo))) {
                        anyos.push({
                          anyo: Number(viajeEditado.anyo),
                          portada: `${viajeEditado.anyo}/Portada${viajeEditado.anyo}.jpg`,
                        });
                        anyos.sort((a, b) => Number(b.anyo) - Number(a.anyo));
                      }

                      const viajes = [...(indiceObj.viajes ?? [])];
                      const idx = viajes.findIndex(
                        (v) => v.id === viajeEditado.id || v.archivo === viajeEditado.archivo
                      );
                      if (idx >= 0) {
                        viajes[idx] = resumenEditado;
                      }

                      entradasTree.push({
                        path: ind.ruta,
                        mode: '100644',
                        type: 'blob',
                        content: JSON.stringify({ anyos, viajes }, null, 2),
                      });
                    }
                  }

                  onProgreso?.(`Comprimiendo ${fotos.length} foto(s) nueva(s)...`);

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

                  const blobsFotos$ = tareasFotos$.length
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

                      onProgreso?.(`Creando commit de edición en ${this.branch}...`);

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
                                message: `Editar viaje ${nombreArchivo}`,
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
