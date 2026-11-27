import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { concatMap, map, switchMap, tap, catchError } from 'rxjs/operators';
import { ContenidoService } from './contenido.service';
import { filtrar } from './buscar.util';
import { Dibujo } from '../interfaces/contenido.interface';
import { NotificationPushService } from './notification-push.service';

@Injectable({ providedIn: 'root' })
export class DibujosService {
  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';
  private readonly branchName = 'main'; // O tu rama actual

  // Rutas de los JSON en origen y docs
  private readonly originJsonPath = 'src/assets/data/dibujos.json';
  private readonly docsJsonPath = 'docs/assets/data/dibujos.json';

  // Carpeta exacta donde se guardarán las imágenes físicas
  private readonly imageFolderSrc = 'src/assets/images/dibujos/';
  private readonly imageFolderDocs = 'docs/assets/images/dibujos/';

  readonly dibujos$: Observable<Dibujo[]> = this.contenido.coleccion<Dibujo>('dibujos');

  constructor(
    private contenido: ContenidoService,
    private http: HttpClient,
    private push: NotificationPushService
  ) {}

  buscar(termino: string): Observable<Dibujo[]> {
    return this.dibujos$.pipe(
      map((dibujos) => filtrar(dibujos, termino, (d) => [d.persona, d.anyo, d.edad, d.detalle]))
    );
  }

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    });
  }

  /**
   * Comprime la imagen antes de subirla
   */
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

  private actualizarJsonDibujos(token: string, mensaje: string, operacion: (dibujos: Dibujo[]) => Dibujo[]): Observable<any> {
    return this.actualizarJsonEnRuta(token, this.originJsonPath, `${mensaje} (Origen)`, operacion).pipe(
      concatMap(() => this.actualizarJsonEnRuta(token, this.docsJsonPath, `${mensaje} (Docs)`, operacion)),
      tap(() => this.contenido.invalidarCache('dibujos'))
    );
  }

  private actualizarJsonEnRuta(token: string, filePath: string, mensaje: string, operacion: (dibujos: Dibujo[]) => Dibujo[]): Observable<any> {
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}?ref=${this.branchName}`;
    const headers = this.getHeaders(token);

    return this.http.get<any>(url, { headers }).pipe(
      switchMap(response => {
        const sha = response.sha;
        const decodedContent = decodeURIComponent(escape(atob(response.content)));
        const lista: Dibujo[] = JSON.parse(decodedContent);

        const listaModificada = operacion(lista);
        const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(listaModificada, null, 2))));

        return this.subirArchivoGitHub(token, filePath, contentBase64, mensaje);
      })
    );
  }

  agregarDibujo(nuevoDibujo: Dibujo, file: File, token: string): Observable<any> {
    return new Observable(observer => {
      this.comprimirImagen(file, 0.8, 1600).then(fileComprimido => {
        const reader = new FileReader();
        reader.readAsDataURL(fileComprimido);
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];

          const extension = file.name.split('.').pop() || 'jpg';
          const nombreUnico = `dibujo_${Date.now()}.${extension}`;

          nuevoDibujo.src = `dibujos/${nombreUnico}`;
          nuevoDibujo.detalle = nuevoDibujo.detalle || '';
          nuevoDibujo.edad = nuevoDibujo.edad !== undefined && nuevoDibujo.edad !== null ? nuevoDibujo.edad.toString() : '';
          nuevoDibujo.anyo = nuevoDibujo.anyo ? nuevoDibujo.anyo.toString() : new Date().getFullYear().toString();

          // 1. Subir imagen comprimida a src y docs
          this.subirArchivoGitHub(token, `${this.imageFolderSrc}${nombreUnico}`, base64String, `Subir imagen ${nombreUnico}`)
            .pipe(
              concatMap(() => this.subirArchivoGitHub(token, `${this.imageFolderDocs}${nombreUnico}`, base64String, `Subir imagen ${nombreUnico} (Docs)`)),
              // 2. Actualizar el JSON de dibujos en origen y docs
              concatMap(() => this.actualizarJsonDibujos(token, `Añadir dibujo de ${nuevoDibujo.persona}`, (dibujos) => {
                const listaSegura = Array.isArray(dibujos) ? dibujos : [];
                const maxId = listaSegura.length > 0 ? Math.max(...listaSegura.map(d => Number(d.id) || 0)) : 0;

                const dibujoNormalizado = {
                  id: maxId + 1,
                  src: `dibujos/${nombreUnico}`,
                  persona: nuevoDibujo.persona || '',
                  anyo: nuevoDibujo.anyo,
                  edad: nuevoDibujo.edad,
                  detalle: nuevoDibujo.detalle
                };

                listaSegura.push(dibujoNormalizado);
                return listaSegura;
              })),
              concatMap(() =>
                this.push.dispararNotificacion(token, 'dibujo', nuevoDibujo.persona || 'Dibujo nuevo').pipe(
                  catchError((err) => {
                    console.warn('Dibujo guardado, pero falló el disparo de notificación push:', err);
                    return of(null);
                  })
                )
              )
            )
            .subscribe({
              next: (res) => { observer.next(res); observer.complete(); },
              error: (err) => {
                console.error('Error detallado en alta de dibujo:', err);
                observer.error(err);
              }
            });
        };
        reader.onerror = (error) => observer.error(error);
      }).catch(err => observer.error(err));
    });
  }

  /**
   * Elimina un archivo físico (imagen) de GitHub usando su ruta y SHA
   */
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

  /**
   * Elimina el registro del JSON y borra las imágenes físicas asociadas en origen y docs
   */
  eliminarDibujo(id: number | string, token: string): Observable<any> {
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.originJsonPath}?ref=${this.branchName}`;
    const headers = this.getHeaders(token);

    return this.http.get<any>(url, { headers }).pipe(
      switchMap(response => {
        const decodedContent = decodeURIComponent(escape(atob(response.content)));
        const dibujos: Dibujo[] = JSON.parse(decodedContent);
        const dibujoAEliminar = dibujos.find(d => Number(d.id) === Number(id));
        const imageSrc = dibujoAEliminar ? dibujoAEliminar.src : null; // Ej: "dibujos/dibujo_123.jpg"

        // 1. Actualizar los JSONs eliminando el registro
        return this.actualizarJsonDibujos(token, `Eliminar dibujo ID ${id}`, (lista) => {
          return lista.filter(d => Number(d.id) !== Number(id));
        }).pipe(
          // 2. Borrar las imágenes físicas de src y docs
          concatMap(() => {
            if (!imageSrc) return of(null);

            // imageSrc ya viene como "dibujos/nombre.jpg", por lo que al unirlo con imageFolderSrc queda perfecto
            // (imageFolderSrc termina en / y imageSrc empieza con dibujos/, así que quitamos la duplicidad si hace falta o usamos la ruta relativa limpia)
            const nombreArchivo = imageSrc.replace('dibujos/', '');
            const imgPathSrc = `${this.imageFolderSrc}${nombreArchivo}`;
            const imgPathDocs = `${this.imageFolderDocs}${nombreArchivo}`;

            return this.eliminarArchivoGitHub(token, imgPathSrc, `Eliminar imagen física ${nombreArchivo}`).pipe(
              concatMap(() => this.eliminarArchivoGitHub(token, imgPathDocs, `Eliminar imagen física ${nombreArchivo} (Docs)`))
            );
          })
        );
      })
    );
  }

  /**
   * Sube múltiples dibujos comprimidos y actualiza el JSON de golpe
   */
  agregarMultiplesDibujos(pendientes: { file: File; persona: string; anyo: string; edad: string; detalle: string }[], token: string): Observable<any> {
    return new Observable(observer => {
      // 1. Comprimimos todas las imágenes en paralelo
      const promesasCompresion = pendientes.map(item => this.comprimirImagen(item.file, 0.8, 1600));

      Promise.all(promesasCompresion).then(archivosComprimidos => {

        // 2. Preparamos las peticiones de subida física para cada imagen (src y docs)
        const subidasFisicas$: Observable<any>[] = [];
        const nuevosRegistrosData: any[] = [];

        archivosComprimidos.forEach((fileComp, index) => {
          const itemOriginal = pendientes[index];
          const extension = itemOriginal.file.name.split('.').pop() || 'jpg';
          const nombreUnico = `dibujo_${Date.now()}_${index}.${extension}`;
          const rutaSrcRelativa = `dibujos/${nombreUnico}`;

          nuevosRegistrosData.push({
            src: rutaSrcRelativa,
            persona: itemOriginal.persona || 'Mateu',
            anyo: itemOriginal.anyo || new Date().getFullYear().toString(),
            edad: itemOriginal.edad ? itemOriginal.edad.toString() : '',
            detalle: itemOriginal.detalle || ''
          });

          // Convertir a base64
          const reader = new FileReader();
          reader.readAsDataURL(fileComp);
          // Creamos una promesa envuelta en observable para leer el base64 de cada archivo
        });

        // Para hacerlo limpio con operadores RxJS, leemos todos los Base64 secuencialmente o en paralelo
        this.leerArchivosEnBase64(archivosComprimidos).observable.subscribe({
          next: (bases64List) => {
            let flujoTotal: Observable<any> = of(null);

            // Encolamos la subida de cada imagen física a src y docs
            bases64List.forEach((base64Str, index) => {
              const nombreUnico = nuevosRegistrosData[index].src.replace('dibujos/', '');

              flujoTotal = flujoTotal.pipe(
                concatMap(() => this.subirArchivoGitHub(token, `${this.imageFolderSrc}${nombreUnico}`, base64Str, `Subir imagen ${nombreUnico}`)),
                concatMap(() => this.subirArchivoGitHub(token, `${this.imageFolderDocs}${nombreUnico}`, base64Str, `Subir imagen ${nombreUnico} (Docs)`))
              );
            });

            // 3. Finalmente, actualizamos el JSON de una sola vez añadiendo todos los nuevos registros
            flujoTotal.pipe(
              concatMap(() => this.actualizarJsonDibujos(token, `Añadir lote de ${nuevosRegistrosData.length} dibujos`, (dibujosActuales) => {
                const listaSegura = Array.isArray(dibujosActuales) ? dibujosActuales : [];
                let maxId = listaSegura.length > 0 ? Math.max(...listaSegura.map(d => Number(d.id) || 0)) : 0;

                nuevosRegistrosData.forEach(nuevo => {
                  maxId++;
                  listaSegura.push({
                    id: maxId,
                    src: nuevo.src,
                    persona: nuevo.persona,
                    anyo: nuevo.anyo,
                    edad: nuevo.edad,
                    detalle: nuevo.detalle
                  });
                });

                return listaSegura;
              })),
              concatMap(() => {
                const tituloLote =
                  nuevosRegistrosData.length === 1
                    ? nuevosRegistrosData[0].persona || 'Dibujo nuevo'
                    : `${nuevosRegistrosData.length} dibujos nuevos`;
                return this.push.dispararNotificacion(token, 'dibujo', tituloLote).pipe(
                  catchError((err) => {
                    console.warn('Dibujos guardados, pero falló el disparo de notificación push:', err);
                    return of(null);
                  })
                );
              })
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
}
