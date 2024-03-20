import { Component, OnDestroy, OnInit } from '@angular/core';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Pregunta } from 'src/app/interfaces/pregunta.interface';
import { CommonService } from 'src/app/services/common.service';
import { PreguntasService } from 'src/app/services/preguntas.service';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css']
})

export class QuizComponent implements OnInit {
  questions: Pregunta[] = [];
  difficulty: string = 'selecciona';
  score: number = 0;
  finDelJuego = new BehaviorSubject(false);
  inicioDelJuego = new BehaviorSubject(false);

  constructor(private preguntasService: PreguntasService, public translate : TranslateService) {}

  ngOnInit() {
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.startGame();
    });
  }

  startGame(){
    if (this.difficulty != 'selecciona'){
      this.inicioDelJuego.next(true);
      this.finDelJuego.next(false);
    }else{
      this.inicioDelJuego.next(false);
    }

    this.loadQuestions();
  }

  loadQuestions() {
    this.preguntasService.getQuestions().subscribe((data: Pregunta[]) => {
      this.questions = this.getQuestionsByLevel(data);
      this.questions.forEach(question => {
        question.selectedOption = '';
      });
    });
  }

  // Método para obtener 10 preguntas aleatorias según el nivel
   getQuestionsByLevel(data : Pregunta[]): Pregunta[] {
    const questionsByLevel = data.filter(question => question.Nivel === this.difficulty);
    const randomQuestions = this.shuffleArray(questionsByLevel).slice(0, 10);
    return randomQuestions;
  }

  selectAnswer(question: any, selectedOption: string) {
    question.selectedOption = selectedOption;
  }

  // Método para mezclar aleatoriamente un array
  shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  submitAnswers() {
    this.score = 0;

    this.score = this.questions.filter(question => question.selectedOption === question.Respuesta).length;
    this.finDelJuego.next(true);
  }

}
