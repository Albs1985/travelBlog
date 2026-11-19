import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { catchError, concatMap, map, switchMap, tap } from 'rxjs/operators';
import { CommonService } from './common.service';
import { ContenidoService } from './contenido.service';

export interface CumpleanosItem {
  id: string;
  nombre: string;
  dia: number;
  mes: number; // 1 a 12
  anyoNacimiento?: number;
  nota?: string;
}

export interface CumpleanosEnriquecido extends CumpleanosItem {
  foto: string;
  edadActual: number | null;
  esHoy: boolean;
  diasHastaProximo: number;
}

interface GithubContentResponse {
  sha?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CumpleanosService {
  // Rutas del JSON en origen (src) y desplegado (docs)
  private readonly originJsonPath = 'src/assets/data/cumpleanyos.json';
  private readonly docsJsonPath = 'docs/assets/data/cumpleanyos.json';
  private readonly jsonUrl = 'assets/data/cumpleanyos.json';

  // Carpetas de imágenes de perfil en origen (src) y desplegado (docs)
  private readonly perfilesCarpeta = 'assets/images/perfiles';
  private readonly imageFolderSrc = 'src/assets/images/perfiles';
  private readonly imageFolderDocs = 'docs/assets/images/perfiles';

  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';
  private readonly repoBranch = 'main';

  private readonly items$ = new BehaviorSubject<CumpleanosItem[]>([]);
  private readonly versionFoto = new Map<string, number>();
  private cargado = false;

  readonly lista$: Observable<CumpleanosEnriquecido[]> = this.items$.pipe(
    map((items) => this.enriquecerYOrdenar(items))
  );

  readonly cumpleanerosHoy$: Observable<CumpleanosEnriquecido[]> = this.lista$.pipe(
    map((lista) => lista.filter((c) => c.esHoy))
  );

  constructor(
    private http: HttpClient,
    private commonService: CommonService,
    private contenidoService: ContenidoService
  ) {
    this.cargarDesdeJson().subscribe();
  }

  cargarDesdeJson(forzar = false): Observable<CumpleanosItem[]> {
    if (this.cargado && !forzar) {
      return of(this.items$.value);
    }

    const urlConCacheBust = `${this.jsonUrl}?t=${Date.now()}`;
    return this.http.get<CumpleanosItem[]>(urlConCacheBust).pipe(
      catchError(() => of([])),
      tap((datos) => {
        const lista = Array.isArray(datos) ? datos : [];
        this.items$.next(lista);
        this.cargado = true;
      })
    );
  }

  /**
   * Genera el nombre de archivo estándar a partir del id: fotoPerfilXXXX.jpg
   * Ej.: "mateu" -> "fotoPerfilMateu.jpg", "iaia-ana" -> "fotoPerfilIaiaAna.jpg"
   */
  obtenerNombreArchivoPerfil(id: string): string {
    const limpio = (id ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim();

    if (!limpio) {
      return 'fotoPerfilFamiliar.jpg';
    }

    const xxxx = limpio
      .split(/\s+/)
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join('');

    return `fotoPerfil${xxxx}.jpg`;
  }

  obtenerRutaPerfil(id: string): string {
    const archivo = this.obtenerNombreArchivoPerfil(id);
    const base = `${this.perfilesCarpeta}/${archivo}`;
    const ver = this.versionFoto.get(archivo);
    return ver ? `${base}?v=${ver}` : base;
  }

  agregar(
    nuevo: Omit<CumpleanosItem, 'id'>,
    token: string,
    archivoImagen?: File | null
  ): Observable<void> {
    const idGenerado = this.generarId(nuevo.nombre);
    const item: CumpleanosItem = {
      ...nuevo,
      id: idGenerado
    };
    const nuevaLista = [...this.items$.value, item];

    return this.subirImagenSiExiste(item.id, token, archivoImagen).pipe(
      concatMap(() =>
        this.guardarJsonEnGithub(nuevaLista, token, `feat(cumpleanos): añadir cumpleaños de ${item.nombre}`)
      ),
      tap(() => {
        this.items$.next(nuevaLista);
        this.cargado = true;
        this.contenidoService.invalidarCache('cumpleanos');
      }),
      map(() => void 0)
    );
  }

  actualizar(
    editado: CumpleanosItem,
    token: string,
    archivoImagen?: File | null
  ): Observable<void> {
    const nuevaLista = this.items$.value.map((item) =>
      item.id === editado.id ? { ...editado } : item
    );

    return this.subirImagenSiExiste(editado.id, token, archivoImagen).pipe(
      concatMap(() =>
        this.guardarJsonEnGithub(nuevaLista, token, `feat(cumpleanos): actualizar cumpleaños de ${editado.nombre}`)
      ),
      tap(() => {
        this.items$.next(nuevaLista);
        this.cargado = true;
        this.contenidoService.invalidarCache('cumpleanos');
      }),
      map(() => void 0)
    );
  }

  eliminar(id: string, token: string): Observable<void> {
    const objetivo = this.items$.value.find((item) => item.id === id);
    const nuevaLista = this.items$.value.filter((item) => item.id !== id);
    const etiqueta = objetivo ? objetivo.nombre : id;

    return this.guardarJsonEnGithub(nuevaLista, token, `feat(cumpleanos): eliminar cumpleaños de ${etiqueta}`).pipe(
      tap(() => {
        this.items$.next(nuevaLista);
        this.cargado = true;
        this.contenidoService.invalidarCache('cumpleanos');
      }),
      map(() => void 0)
    );
  }

  private subirImagenSiExiste(
    idPersona: string,
    token: string,
    archivoImagen?: File | null
  ): Observable<void> {
    if (!archivoImagen) {
      return of(void 0);
    }

    const tokenLimpio = (token ?? '').trim();
    if (!tokenLimpio) {
      return throwError(() => new Error('Falta el token de GitHub'));
    }

    const nombreArchivo = this.obtenerNombreArchivoPerfil(idPersona);
    const rutaSrc = `${this.imageFolderSrc}/${nombreArchivo}`;
    const rutaDocs = `${this.imageFolderDocs}/${nombreArchivo}`;

    return from(this.comprimirImagen(archivoImagen, 0.8, 800)).pipe(
      switchMap((fileComprimido) => this.leerArchivoComoBase64(fileComprimido)),
      switchMap((base64) =>
        this.subirArchivoAGithub(
          rutaSrc,
          base64,
          tokenLimpio,
          `feat(perfiles): actualizar foto ${nombreArchivo} (src)`
        ).pipe(
          concatMap(() =>
            this.subirArchivoAGithub(
              rutaDocs,
              base64,
              tokenLimpio,
              `feat(perfiles): actualizar foto ${nombreArchivo} (docs)`
            )
          )
        )
      ),
      tap(() => {
        this.versionFoto.set(nombreArchivo, Date.now());
      }),
      map(() => void 0)
    );
  }

  private guardarJsonEnGithub(
    nuevaLista: CumpleanosItem[],
    token: string,
    mensaje: string
  ): Observable<void> {
    const tokenLimpio = (token ?? '').trim();
    if (!tokenLimpio) {
      return throwError(() => new Error('Falta el token de GitHub'));
    }

    const contenidoFormateado = JSON.stringify(nuevaLista, null, 2) + '\n';
    const contentBase64 = this.codificarBase64Utf8(contenidoFormateado);

    return this.subirArchivoAGithub(this.originJsonPath, contentBase64, tokenLimpio, `${mensaje} (Origen)`).pipe(
      concatMap(() =>
        this.subirArchivoAGithub(this.docsJsonPath, contentBase64, tokenLimpio, `${mensaje} (Docs)`)
      ),
      map(() => void 0)
    );
  }

  private subirArchivoAGithub(
    rutaRepo: string,
    contentBase64: string,
    token: string,
    mensaje: string
  ): Observable<unknown> {
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${rutaRepo}`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    });

    return this.http.get<GithubContentResponse>(`${apiUrl}?ref=${this.repoBranch}`, { headers }).pipe(
      catchError((err) => {
        if (err?.status === 404) {
          return of({ sha: undefined } as GithubContentResponse);
        }
        return throwError(() => err);
      }),
      switchMap((fileMeta) => {
        const body: Record<string, unknown> = {
          message: mensaje,
          content: contentBase64,
          branch: this.repoBranch
        };
        if (fileMeta?.sha) {
          body['sha'] = fileMeta.sha;
        }
        return this.http.put(apiUrl, body, { headers });
      })
    );
  }

  private comprimirImagen(file: File, calidad = 0.8, maxWidth = 800): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const img = new Image();
        img.src = String(event.target?.result || '');
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
              resolve(
                new File([blob], file.name, {
                  type: mimeType,
                  lastModified: Date.now()
                })
              );
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

  private leerArchivoComoBase64(archivo: File): Observable<string> {
    return new Observable<string>((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultado = String(reader.result || '');
        const partes = resultado.split(',');
        const base64 = partes.length > 1 ? partes[1] : '';
        if (!base64) {
          observer.error(new Error('No se pudo leer la imagen seleccionada'));
          return;
        }
        observer.next(base64);
        observer.complete();
      };
      reader.onerror = () => observer.error(reader.error || new Error('Error leyendo archivo'));
      reader.readAsDataURL(archivo);
    });
  }

  private codificarBase64Utf8(texto: string): string {
    const bytes = new TextEncoder().encode(texto);
    let binario = '';
    for (let i = 0; i < bytes.length; i++) {
      binario += String.fromCharCode(bytes[i]);
    }
    return btoa(binario);
  }

  generarId(nombre: string): string {
    const base = (nombre ?? 'cumple')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const candidato = base || 'cumple';
    const existe = this.items$.value.some((item) => item.id === candidato);
    return existe ? `${candidato}-${Date.now()}` : candidato;
  }

  private enriquecerYOrdenar(items: CumpleanosItem[]): CumpleanosEnriquecido[] {
    const hoy = new Date();
    const anyoActual = hoy.getFullYear();
    const inicioHoy = new Date(anyoActual, hoy.getMonth(), hoy.getDate()).getTime();
    const msPorDia = 1000 * 60 * 60 * 24;

    return items
      .map((item) => {
        const mesIdx = Math.max(0, Math.min(11, Number(item.mes) - 1));
        const diaNum = Math.max(1, Math.min(31, Number(item.dia)));

        let proximoCumple = new Date(anyoActual, mesIdx, diaNum).getTime();
        if (proximoCumple < inicioHoy) {
          proximoCumple = new Date(anyoActual + 1, mesIdx, diaNum).getTime();
        }

        const diasHastaProximo = Math.round((proximoCumple - inicioHoy) / msPorDia);
        const esHoy = hoy.getMonth() === mesIdx && hoy.getDate() === diaNum;

        const edad =
          typeof item.anyoNacimiento === 'number' && !Number.isNaN(item.anyoNacimiento)
            ? this.commonService.calcularEdadEnAnyo(
                item.nombre,
                anyoActual,
                hoy.getMonth() + 1,
                hoy.getDate()
              ) ?? Math.max(0, anyoActual - item.anyoNacimiento)
            : null;

        return {
          ...item,
          dia: diaNum,
          mes: mesIdx + 1,
          foto: this.obtenerRutaPerfil(item.id),
          edadActual: edad,
          esHoy,
          diasHastaProximo
        };
      })
      .sort((a, b) => a.diasHastaProximo - b.diasHastaProximo);
  }
}
