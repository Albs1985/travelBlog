import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AutenticationService {

  //A petición de Alba, siempre autenticado
  autenticado$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);//SI PONEMOS A TRUE ESTE OBJETO ESTAREMOS AUTENTICADOS SIEMPRE, SIN NECESIDAD DE VALIDAR NADA.

  //Forzamos el autenticado para el relato de la iaia Ana
  autenticadoRelatoIaia$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);//SI PONEMOS A TRUE ESTE OBJETO ESTAREMOS AUTENTICADOS SIEMPRE, SIN NECESIDAD DE VALIDAR NADA.

  soloIaiaAutenticado : boolean = true;

  private pass : string = 'familia2019';

  constructor() { }

  login(password: string): boolean {

    if (password === this.pass){
      this.autenticado$.next(true);
    }else{
      this.autenticado$.next(false);
    }
    return this.autenticado$.value;
  }

  loginRelatoIaia(password: string): boolean {

    if (password === this.pass){
      this.autenticadoRelatoIaia$.next(true);
    }else{
      this.autenticadoRelatoIaia$.next(false);
    }
    return this.autenticadoRelatoIaia$.value;

  }

  isLoggedIn(): boolean {
    return this.autenticado$.value;
  }

  isLoggedInRelatoIaia(): boolean {
    return this.autenticadoRelatoIaia$.value;
  }

}
