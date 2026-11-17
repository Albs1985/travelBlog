import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { concatMap, map, switchMap, tap } from 'rxjs/operators';
import { ContenidoService } from './contenido.service';
import { filtrar } from './buscar.util';
import { Frase } from '../interfaces/contenido.interface';

@Injectable({ providedIn: 'root' })
export class FrasesService {
  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';
  private readonly branchName = 'main';

  private readonly originFilePath = 'src/assets/data/generated/frases.json';
  private readonly docsFilePath = 'docs/assets/data/generated/frases.json';

  constructor(private contenido: ContenidoService, private http: HttpClient) {}

  /** Obtiene las frases frescas (invalidando caché) y aplica el filtro de búsqueda */
  obtenerFrasesYFiltrar(termino: string): Observable<Frase[]> {
    return this.contenido.coleccion<Frase>('frases').pipe(
      map((frases) => filtrar(frases, termino, (f) => [f.persona, f.fecha, f.frase, f.explicacion]))
    );
  }

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    });
  }

  private actualizarArchivoEnGitHub(token: string, filePath: string, mensajeCommit: string, operacion: (frases: Frase[]) => Frase[]): Observable<any> {
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}?ref=${this.branchName}`;
    const headers = this.getHeaders(token);

    return this.http.get<any>(url, { headers }).pipe(
      switchMap(response => {
        const sha = response.sha;
        const decodedContent = decodeURIComponent(escape(atob(response.content)));
        const frasesArray: Frase[] = JSON.parse(decodedContent);

        const frasesModificadas = operacion(frasesArray);
        const updatedContentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(frasesModificadas, null, 2))));

        const putUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}`;
        const body = {
          message: mensajeCommit,
          content: updatedContentBase64,
          sha: sha,
          branch: this.branchName
        };

        return this.http.put(putUrl, body, { headers });
      })
    );
  }

  private modificarAmbosArchivos(token: string, mensaje: string, operacion: (frases: Frase[]) => Frase[]): Observable<any> {
    return this.actualizarArchivoEnGitHub(token, this.originFilePath, `${mensaje} (Origen)`, operacion).pipe(
      concatMap(() =>
        this.actualizarArchivoEnGitHub(token, this.docsFilePath, `${mensaje} (Docs)`, operacion)
      ),
      tap(() => {
        // 👈 Limpiamos la caché interna de Angular para que el siguiente GET sea real
        this.contenido.invalidarCache('frases');
      })
    );
  }

  agregarFrase(nuevaFrase: Frase, token: string): Observable<any> {
    return this.modificarAmbosArchivos(token, `Añadir frase de ${nuevaFrase.persona}`, (frases) => {
      const maxId = frases.length > 0 ? Math.max(...frases.map(f => Number(f.id) || 0)) : 0;
      nuevaFrase.id = maxId + 1;
      frases.push(nuevaFrase);
      return frases;
    });
  }

  editarFrase(fraseEditada: Frase, token: string): Observable<any> {
    return this.modificarAmbosArchivos(token, `Editar frase ID ${fraseEditada.id}`, (frases) => {
      const index = frases.findIndex(f => Number(f.id) === Number(fraseEditada.id));
      if (index !== -1) {
        frases[index] = fraseEditada;
      }
      return frases;
    });
  }

  eliminarFrase(id: number, token: string): Observable<any> {
    return this.modificarAmbosArchivos(token, `Eliminar frase ID ${id}`, (frases) => {
      return frases.filter(f => Number(f.id) !== Number(id));
    });
  }
}
