import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AutenticationService {

  autenticado$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private pass : string = 'familia2019';

  constructor() { }

  login(password: string): boolean {
    // Aquí puedes verificar si la contraseña proporcionada coincide con la contraseña definida en el código
    if (password === this.pass){
      this.autenticado$.next(true);
    }else{
      this.autenticado$.next(false);
    }
    return this.autenticado$.value;
  }

  isLoggedIn(): boolean {
    // Verifica si el usuario está autenticado
    // Puedes implementar lógica más sofisticada aquí si lo necesitas
    return this.autenticado$.value; // Cambia esto según tus requisitos
  }

}
