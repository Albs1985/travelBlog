import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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
  private readonly jsonPath = 'assets/data/cumpleanyos.json';
  private readonly jsonUrl = 'assets/data/cumpleanyos.json';

  // Ajusta owner y repo a los de tu repositorio en GitHub
  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';
  private readonly repoBranch = 'main'; // O tu rama actual

  private readonly items$ = new BehaviorSubject<CumpleanosItem[]>([]);
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
    this.cargarDesdeJson();
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

  agregar(nuevo: Omit<CumpleanosItem, 'id'>, token: string): Observable<void> {
    const item: CumpleanosItem = {
      ...nuevo,
      id: this.generarId(nuevo.nombre)
    };
    const nuevaLista = [...this.items$.value, item];
    return this.guardarEnGithub(nuevaLista, token, `feat(cumpleanos): añadir cumpleaños de ${item.nombre}`);
  }

  actualizar(editado: CumpleanosItem, token: string): Observable<void> {
    const nuevaLista = this.items$.value.map((item) =>
      item.id === editado.id ? { ...editado } : item
    );
    return this.guardarEnGithub(nuevaLista, token, `feat(cumpleanos): actualizar cumpleaños de ${editado.nombre}`);
  }

  eliminar(id: string, token: string): Observable<void> {
    const objetivo = this.items$.value.find((item) => item.id === id);
    const nuevaLista = this.items$.value.filter((item) => item.id !== id);
    const etiqueta = objetivo ? objetivo.nombre : id;
    return this.guardarEnGithub(nuevaLista, token, `feat(cumpleanos): eliminar cumpleaños de ${etiqueta}`);
  }

  obtenerFotoPerfil(nombre: string): string {
    const limpio = (nombre ?? '').trim();
    if (!limpio) {
      return 'assets/icons/iconoFamiliar.png';
    }
    const clave = limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
    return `assets/images/perfiles/fotoPerfil${clave}.jpg`;
  }

  private guardarEnGithub(nuevaLista: CumpleanosItem[], token: string, mensaje: string): Observable<void> {
    const tokenLimpio = (token ?? '').trim();
    if (!tokenLimpio) {
      return throwError(() => new Error('Falta el token de GitHub'));
    }

    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.jsonPath}`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${tokenLimpio}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    });

    const contenidoFormateado = JSON.stringify(nuevaLista, null, 2) + '\n';
    const contentBase64 = this.codificarBase64Utf8(contenidoFormateado);

    return this.http.get<GithubContentResponse>(`${apiUrl}?ref=${this.repoBranch}`, { headers }).pipe(
      catchError((err) => {
        // Si el archivo aún no existe (404), permitimos crearlo sin sha
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
      }),
      tap(() => {
        this.items$.next(nuevaLista);
        this.cargado = true;
        this.contenidoService.invalidarCache('cumpleanos');
      }),
      map(() => void 0)
    );
  }

  private codificarBase64Utf8(texto: string): string {
    const bytes = new TextEncoder().encode(texto);
    let binario = '';
    for (let i = 0; i < bytes.length; i++) {
      binario += String.fromCharCode(bytes[i]);
    }
    return btoa(binario);
  }

  private generarId(nombre: string): string {
    const base = (nombre ?? 'cumple')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${base || 'cumple'}-${Date.now()}`;
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
          foto: this.obtenerFotoPerfil(item.nombre),
          edadActual: edad,
          esHoy,
          diasHastaProximo
        };
      })
      .sort((a, b) => a.diasHastaProximo - b.diasHastaProximo);
  }
}
