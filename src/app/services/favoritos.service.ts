import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { combineLatest, Observable, of } from 'rxjs';
import { concatMap, map, switchMap, tap, catchError } from 'rxjs/operators';
import { ContenidoService } from './contenido.service';
import { filtrar } from './buscar.util';
import { FotoFavorita } from '../interfaces/contenido.interface';

export interface FotoFavoritaPendiente {
  file: File;
  previewUrl: string;
  anyo: string;
  lugar: string;
  etiquetas: string;
  personasStr: string;
  desc: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';
  private readonly branchName = 'main';

  private readonly originJsonPath = 'src/assets/data/generated/favoritos.json';
  private readonly docsJsonPath = 'docs/assets/data/generated/favoritos.json';

  private readonly imageFolderSrc = 'src/assets/images/favoritos/';
  private readonly imageFolderDocs = 'docs/assets/images/favoritos/';

  readonly favoritos$: Observable<FotoFavorita[]> = this.contenido.coleccion<FotoFavorita>('favoritos');

  constructor(private contenido: ContenidoService, private http: HttpClient) {}

  buscar(termino: string): Observable<FotoFavorita[]> {
    return this.favoritos$.pipe(
      map((fotos) => filtrar(fotos, termino, (f) => [
        f.anyo,
        f.lugar || '',
        f.etiquetas || '',
        f.personas ? f.personas.join(', ') : '',
        f.desc || ''
      ]))
    );
  }

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    });
  }

  private comprimirImagen(file: File, calidad: number = 0.8, maxWidth: number = 1600): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo inicializar el canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falló la compresión'));
                return;
              }
              const archivoComprimido = new File([blob], file.name, {
                type: mimeType,
                lastModified: Date.now(),
              });
              resolve(archivoComprimido);
            },
            mimeType,
            calidad
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  private subirArchivoGitHub(token: string, filePath: string, contentBase64: string, mensaje: string): Observable<any> {
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}?ref=${this.branchName}`;
    const headers = this.getHeaders(token);

    return this.http.get<any>(url, { headers, observe: 'response' }).pipe(
      switchMap(response => {
        const sha = response.body?.sha;
        const putUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}`;
        const body: any = {
          message: mensaje,
          content: contentBase64,
          branch: this.branchName
        };
        if (sha) body.sha = sha;
        return this.http.put(putUrl, body, { headers });
      }),
      catchError(() => {
        const putUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}`;
        const body = {
          message: mensaje,
          content: contentBase64,
          branch: this.branchName
        };
        return this.http.put(putUrl, body, { headers });
      })
    );
  }

  private actualizarJsonFavoritos(token: string, mensaje: string, operacion: (fotos: FotoFavorita[]) => FotoFavorita[]): Observable<any> {
    return this.actualizarJsonEnRuta(token, this.originJsonPath, `${mensaje} (Origen)`, operacion).pipe(
      concatMap(() => this.actualizarJsonEnRuta(token, this.docsJsonPath, `${mensaje} (Docs)`, operacion)),
      tap(() => this.contenido.invalidarCache('favoritos'))
    );
  }

  private actualizarJsonEnRuta(token: string, filePath: string, mensaje: string, operacion: (fotos: FotoFavorita[]) => FotoFavorita[]): Observable<any> {
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}?ref=${this.branchName}`;
    const headers = this.getHeaders(token);

    return this.http.get<any>(url, { headers }).pipe(
      switchMap(response => {
        const sha = response.sha;
        const decodedContent = decodeURIComponent(escape(atob(response.content)));
        const lista: FotoFavorita[] = JSON.parse(decodedContent);

        const listaModificada = operacion(lista);
        const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(listaModificada, null, 2))));

        return this.subirArchivoGitHub(token, filePath, contentBase64, mensaje);
      })
    );
  }

  agregarMultiplesFavoritos(pendientes: FotoFavoritaPendiente[], token: string): Observable<any> {
    return new Observable(observer => {
      const promesasCompresion = pendientes.map(item => this.comprimirImagen(item.file, 0.8, 1600));

      Promise.all(promesasCompresion).then(archivosComprimidos => {
        const nuevosRegistrosData: any[] = [];

        archivosComprimidos.forEach((fileComp, index) => {
          const itemOriginal = pendientes[index];
          const extension = itemOriginal.file.name.split('.').pop() || 'jpg';
          const nombreUnico = `fotoFav_${Date.now()}_${index}.${extension}`;
          const rutaSrcRelativa = `favoritos/${nombreUnico}`;

          const personasArray = itemOriginal.personasStr
            ? itemOriginal.personasStr.split(',').map(p => p.trim()).filter(p => p.length > 0)
            : [];

          nuevosRegistrosData.push({
            src: rutaSrcRelativa,
            anyo: itemOriginal.anyo || new Date().getFullYear().toString(),
            lugar: itemOriginal.lugar || '',
            etiquetas: itemOriginal.etiquetas || '',
            personas: personasArray,
            desc: itemOriginal.desc || ''
          });
        });

        this.leerArchivosEnBase64(archivosComprimidos).observable.subscribe({
          next: (bases64List) => {
            let flujoTotal: Observable<any> = of(null);

            bases64List.forEach((base64Str, index) => {
              const nombreUnico = nuevosRegistrosData[index].src.replace('favoritos/', '');

              flujoTotal = flujoTotal.pipe(
                concatMap(() => this.subirArchivoGitHub(token, `${this.imageFolderSrc}${nombreUnico}`, base64Str, `Subir foto favorita ${nombreUnico}`)),
                concatMap(() => this.subirArchivoGitHub(token, `${this.imageFolderDocs}${nombreUnico}`, base64Str, `Subir foto favorita ${nombreUnico} (Docs)`))
              );
            });

            flujoTotal.pipe(
              concatMap(() => this.actualizarJsonFavoritos(token, `Añadir lote de ${nuevosRegistrosData.length} fotos favoritas`, (fotosActuales) => {
                const listaSegura = Array.isArray(fotosActuales) ? fotosActuales : [];
                nuevosRegistrosData.reverse().forEach(nuevo => {
                  listaSegura.unshift(nuevo);
                });
                return listaSegura;
              }))
            ).subscribe({
              next: (res) => { observer.next(res); observer.complete(); },
              error: (err) => observer.error(err)
            });

          },
          error: (err) => observer.error(err)
        });

      }).catch(err => observer.error(err));
    });
  }

  private leerArchivosEnBase64(archivos: File[]): { observable: Observable<string[]> } {
    return {
      observable: new Observable(obs => {
        const resultados: string[] = [];
        let procesados = 0;

        archivos.forEach((file, index) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            resultados[index] = (reader.result as string).split(',')[1];
            procesados++;
            if (procesados === archivos.length) {
              obs.next(resultados);
              obs.complete();
            }
          };
          reader.onerror = (err) => obs.error(err);
        });
      })
    };
  }

  private eliminarArchivoGitHub(token: string, filePath: string, mensaje: string): Observable<any> {
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}?ref=${this.branchName}`;
    const headers = this.getHeaders(token);

    return this.http.get<any>(url, { headers }).pipe(
      switchMap(response => {
        const sha = response.sha;
        const deleteUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}`;
        const body = {
          message: mensaje,
          sha: sha,
          branch: this.branchName
        };
        return this.http.request('delete', deleteUrl, { headers, body });
      }),
      catchError(err => {
        console.warn(`No se pudo encontrar o eliminar el archivo físico ${filePath}:`, err);
        return of(null);
      })
    );
  }

  eliminarFavorito(src: string, token: string): Observable<any> {
    return this.actualizarJsonFavoritos(token, `Eliminar foto favorita ${src}`, (lista) => {
      return lista.filter(f => f.src !== src);
    }).pipe(
      concatMap(() => {
        if (!src || src.startsWith('about/')) return of(null);

        const nombreArchivo = src.replace('favoritos/', '');
        const imgPathSrc = `${this.imageFolderSrc}${nombreArchivo}`;
        const imgPathDocs = `${this.imageFolderDocs}${nombreArchivo}`;

        return this.eliminarArchivoGitHub(token, imgPathSrc, `Eliminar imagen física ${nombreArchivo}`).pipe(
          concatMap(() => this.eliminarArchivoGitHub(token, imgPathDocs, `Eliminar imagen física ${nombreArchivo} (Docs)`))
        );
      })
    );
  }

  /**
   * Elimina múltiples fotos favoritas de golpe y sus ficheros físicos en un único commit
   */
  eliminarMultiplesFavoritos(srcsAEliminar: string[], token: string): Observable<any> {
    return this.actualizarJsonFavoritos(token, `Eliminar lote de ${srcsAEliminar.length} fotos favoritas`, (lista) => {
      return lista.filter(f => !srcsAEliminar.includes(f.src));
    }).pipe(
      concatMap(() => {
        // Creamos un flujo para borrar en paralelo o secuencia todas las imágenes físicas que no sean de "about/"
        const flujosBorradoFisico = srcsAEliminar
          .filter(src => src && !src.startsWith('about/'))
          .map(src => {
            const nombreArchivo = src.replace('favoritos/', '');
            const imgPathSrc = `${this.imageFolderSrc}${nombreArchivo}`;
            const imgPathDocs = `${this.imageFolderDocs}${nombreArchivo}`;

            return this.eliminarArchivoGitHub(token, imgPathSrc, `Eliminar imagen física ${nombreArchivo}`).pipe(
              concatMap(() => this.eliminarArchivoGitHub(token, imgPathDocs, `Eliminar imagen física ${nombreArchivo} (Docs)`))
            );
          });

        if (flujosBorradoFisico.length === 0) return of(null);
        // Combinamos todos los borrados físicos para que se ejecuten juntos
        return combineLatest(flujosBorradoFisico);
      })
    );
  }
}
