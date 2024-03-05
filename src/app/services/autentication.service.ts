import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AutenticationService {

  //A petición de Alba, siempre autenticado
  autenticado$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);//SI PONEMOS A TRUE ESTE OBJETO ESTAREMOS AUTENTICADOS SIEMPRE, SIN NECESIDAD DE VALIDAR NADA.

  //Forzamos el autenticado para el relato de la iaia Ana
  autenticadoRelatoIaia$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);//SI PONEMOS A TRUE ESTE OBJETO ESTAREMOS AUTENTICADOS SIEMPRE, SIN NECESIDAD DE VALIDAR NADA.

  private pass : string = 'familia2019';

  constructor() { }

  login(password: string): boolean {

    //PARA AUTENTICARSE EN CADA PÁGINA DE LA APLICACIÓN, DEVOLVEMOS EL this.autenticado$
        // Aquí puedes verificar si la contraseña proporcionada coincide con la contraseña definida en el código
        // if (password === this.pass){
        //   this.autenticado$.next(true);
        // }else{
        //   this.autenticado$.next(false);
        // }
        // return this.autenticado$.value;

    if (password === this.pass){
      this.autenticadoRelatoIaia$.next(true);
    }else{
      this.autenticadoRelatoIaia$.next(false);
    }
    return this.autenticadoRelatoIaia$.value;

  }

  isLoggedIn(): boolean {
    // Verifica si el usuario está autenticado
    // Puedes implementar lógica más sofisticada aquí si lo necesitas
    return this.autenticado$.value; // Cambia esto según tus requisitos
  }

  isLoggedInRelatoIaia(): boolean {
    // Verifica si el usuario está autenticado
    // Puedes implementar lógica más sofisticada aquí si lo necesitas
    return this.autenticadoRelatoIaia$.value; // Cambia esto según tus requisitos
  }

}
