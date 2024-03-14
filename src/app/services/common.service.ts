import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Viajero } from '../interfaces/viajero.interface';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommonService {


  modoLibro$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  sinIdioma$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  modoJuegos$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);


  constructor(private http: HttpClient) {

  }

}
