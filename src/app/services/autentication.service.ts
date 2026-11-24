import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';

export interface ResultadoValidacionGithub {
  valido: boolean;
  usuario?: string;
  motivo?: 'sin_token' | 'invalido' | 'sin_acceso_repo' | 'error_red';
}

@Injectable({
  providedIn: 'root'
})
export class AutenticationService {
  // Se mantiene por compatibilidad con el resto de la app
  autenticado$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  autenticadoRelatoIaia$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private readonly storageKeyGithub = 'gh_travel_token';
  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';

  private readonly tokenGithubValidoSubject$ = new BehaviorSubject<boolean>(false);
  readonly tokenGithubValido$ = this.tokenGithubValidoSubject$.asObservable();

  private readonly validandoTokenGithubSubject$ = new BehaviorSubject<boolean>(false);
  readonly validandoTokenGithub$ = this.validandoTokenGithubSubject$.asObservable();

  private cacheValidacion = new Map<string, Observable<ResultadoValidacionGithub>>();

  constructor(private http: HttpClient) {
    const tokenInicial = this.obtenerTokenGithub();
    if (tokenInicial) {
      this.validarTokenGithub(tokenInicial).subscribe();
    }
  }

  obtenerTokenGithub(): string {
    return (
      localStorage.getItem(this.storageKeyGithub) ||
      localStorage.getItem('github_token') ||
      localStorage.getItem('token') ||
      ''
    ).trim();
  }

  guardarTokenGithub(token: string): void {
    const limpio = (token ?? '').trim();
    if (limpio) {
      localStorage.setItem(this.storageKeyGithub, limpio);
    } else {
      localStorage.removeItem(this.storageKeyGithub);
    }
    this.limpiarCacheValidacion();
    this.validarTokenGithub(limpio, true).subscribe();
  }

  limpiarCacheValidacion(): void {
    this.cacheValidacion.clear();
  }

  estaTokenGithubValido(): boolean {
    return this.tokenGithubValidoSubject$.value;
  }

  estaValidandoTokenGithub(): boolean {
    return this.validandoTokenGithubSubject$.value;
  }

  validarTokenGithub(
    tokenRaw?: string,
    forzarRefresco = false
  ): Observable<ResultadoValidacionGithub> {
    const token = (tokenRaw ?? this.obtenerTokenGithub()).trim();

    if (!token) {
      this.tokenGithubValidoSubject$.next(false);
      this.validandoTokenGithubSubject$.next(false);
      return of({ valido: false, motivo: 'sin_token' });
    }

    if (forzarRefresco) {
      this.cacheValidacion.delete(token);
    }

    const cacheado = this.cacheValidacion.get(token);
    if (cacheado) {
      return cacheado.pipe(
        tap((res) => this.tokenGithubValidoSubject$.next(res.valido))
      );
    }

    this.validandoTokenGithubSubject$.next(true);
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    });

    const peticion$ = new Observable<ResultadoValidacionGithub>((observer) => {
      this.http.get<any>('https://api.github.com/user', { headers }).subscribe({
        next: (user) => {
          const login = typeof user?.login === 'string' ? user.login.trim() : '';
          if (!login) {
            this.validandoTokenGithubSubject$.next(false);
            this.tokenGithubValidoSubject$.next(false);
            observer.next({ valido: false, motivo: 'invalido' });
            observer.complete();
            return;
          }

          const urlRepo = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}`;
          this.http.get<any>(urlRepo, { headers }).subscribe({
            next: () => {
              this.validandoTokenGithubSubject$.next(false);
              this.tokenGithubValidoSubject$.next(true);
              observer.next({ valido: true, usuario: login });
              observer.complete();
            },
            error: (errRepo) => {
              this.validandoTokenGithubSubject$.next(false);
              this.tokenGithubValidoSubject$.next(false);
              const status = errRepo?.status;
              observer.next({
                valido: false,
                usuario: login,
                motivo: status === 404 || status === 403 ? 'sin_acceso_repo' : 'error_red'
              });
              observer.complete();
            }
          });
        },
        error: (err) => {
          this.validandoTokenGithubSubject$.next(false);
          this.tokenGithubValidoSubject$.next(false);
          const status = err?.status;
          observer.next({
            valido: false,
            motivo: status === 401 || status === 403 ? 'invalido' : 'error_red'
          });
          observer.complete();
        }
      });
    }).pipe(shareReplay(1));

    this.cacheValidacion.set(token, peticion$);
    return peticion$;
  }

  isLoggedIn(): boolean {
    return this.autenticado$.value;
  }

  isLoggedInRelatoIaia(): boolean {
    return this.autenticadoRelatoIaia$.value;
  }
}
