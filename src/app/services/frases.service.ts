import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Frase } from '../interfaces/contenido.interface';
import { ContenidoService } from './contenido.service';
import { filtrar } from './buscar.util';

@Injectable({ providedIn: 'root' })
export class FrasesService {
  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';
  private readonly filePath = 'src/assets/data/generated/frases.json';

  // 👈 AQUÍ: Pon el nombre exacto de la rama donde estás desarrollando ahora mismo
  private readonly branchName = 'main';

  readonly frases$: Observable<Frase[]> = this.contenido.coleccion<Frase>('frases');

  constructor(private contenido: ContenidoService, private http: HttpClient) {}

  buscar(termino: string): Observable<Frase[]> {
    return this.frases$.pipe(
      map((frases) => filtrar(frases, termino, (f) => [f.persona, f.fecha, f.frase, f.explicacion]))
    );
  }

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    });
  }

  private modificarArchivoGitHub(token: string, mensajeCommit: string, operacion: (frases: Frase[]) => Frase[]): Observable<any> {
    // 👈 Añadimos ?ref=branchName en el GET para que busque en tu rama y no en main/master
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}?ref=${this.branchName}`;
    const headers = this.getHeaders(token);

    return this.http.get<any>(url, { headers }).pipe(
      switchMap(response => {
        const sha = response.sha;
        const decodedContent = decodeURIComponent(escape(atob(response.content)));
        const frasesArray: Frase[] = JSON.parse(decodedContent);

        const frasesModificadas = operacion(frasesArray);

        const updatedContentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(frasesModificadas, null, 2))));

        // La URL para el PUT no lleva el query string ?ref, sino que la rama va dentro del body JSON
        const putUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}`;
        const body = {
          message: mensajeCommit,
          content: updatedContentBase64,
          sha: sha,
          branch: this.branchName // 👈 Indicamos explícitamente en qué rama debe hacer el commit
        };

        return this.http.put(putUrl, body, { headers }).pipe(
          tap(() => this.contenido.invalidarCache('frases'))
        );
      })
    );
  }

  agregarFrase(nuevaFrase: Frase, token: string): Observable<any> {
    return this.modificarArchivoGitHub(token, `Añadir frase de ${nuevaFrase.persona}`, (frases) => {
      const maxId = frases.length > 0 ? Math.max(...frases.map(f => Number(f.id) || 0)) : 0;
      nuevaFrase.id = maxId + 1;
      frases.push(nuevaFrase);
      return frases;
    });
  }

  editarFrase(fraseEditada: Frase, token: string): Observable<any> {
    return this.modificarArchivoGitHub(token, `Editar frase ID ${fraseEditada.id}`, (frases) => {
      const index = frases.findIndex(f => Number(f.id) === Number(fraseEditada.id));
      if (index !== -1) {
        frases[index] = fraseEditada;
      }
      return frases;
    });
  }

  eliminarFrase(id: number, token: string): Observable<any> {
    return this.modificarArchivoGitHub(token, `Eliminar frase ID ${id}`, (frases) => {
      return frases.filter(f => Number(f.id) !== Number(id));
    });
  }
}
