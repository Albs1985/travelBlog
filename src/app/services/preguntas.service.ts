import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { Pregunta } from '../interfaces/pregunta.interface';
import { PreguntaContenido } from '../interfaces/contenido.interface';
import { ContenidoService } from './contenido.service';

/** Preguntas del quiz (content/preguntas.json), en el idioma activo. */
@Injectable({
  providedIn: 'root'
})
export class PreguntasService {
  cargandoPreguntas$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  constructor(private contenido: ContenidoService, public translate: TranslateService) {}

  getQuestions(): Observable<Pregunta[]> {
    this.cargandoPreguntas$.next(true);
    const idioma = (this.translate.currentLang || this.translate.defaultLang || 'es') as 'es' | 'val';
    return this.contenido.coleccion<PreguntaContenido>('preguntas').pipe(
      map((lista) =>
        // Objetos nuevos en cada llamada: el quiz baraja y marca las respuestas sobre ellos
        lista.map((p) => {
          const q = p[idioma] ?? p.es;
          return {
            Pregunta: q.pregunta,
            Respuesta: q.correcta,
            Otras_respuestas: [q.correcta, ...q.incorrectas],
            Nivel: p.nivel,
            selectedOption: '',
          } as Pregunta;
        })
      )
    );
  }
}
