import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Pregunta } from '../interfaces/pregunta.interface';
import { HttpClient } from '@angular/common/http';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class PreguntasService {

  jsonPreguntasES = "assets/data/preguntasES.json";
  jsonPreguntasVAL = "assets/data/preguntasVAL.json";
  cargandoPreguntas$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  constructor(private http: HttpClient, public translate : TranslateService) {

  }

  getQuestions(): Observable<Pregunta[]>{

    this.cargandoPreguntas$.next(true);

    let ficheroJson = '';
    if (this.translate.currentLang == 'es'){
      ficheroJson = this.jsonPreguntasES;
    }else if (this.translate.currentLang == 'val'){
      ficheroJson = this.jsonPreguntasVAL;
    }
    return this.http.get<any>(ficheroJson).pipe(
      map((data: any) => {
        // Convertir el objeto en un array de preguntas
        return Object.keys(data).map(key => data[key]);
      })
    );

  }
}
