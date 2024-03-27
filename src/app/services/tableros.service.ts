import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

// Interfaz para definir la estructura de un tablero
interface Tablero {
  rutaImagen: string;
  nombreJuego: string;
  numJugadores: string;
}

@Injectable({
  providedIn: 'root'
})


export class TablerosService {

  jsonTableros = "assets/data/tableros.json";

  cargandoTableros$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  constructor(private http: HttpClient, public translate : TranslateService) {

  }

  getTableros(): Observable<Tablero[]> {
    this.cargandoTableros$.next(true);

    return this.http.get<any[]>(this.jsonTableros).pipe(
      map((data: any[]) => {
        // Mapear cada objeto del JSON a un objeto con coordenadas y persona
        return data.map(item => ({
          rutaImagen: String(item.rutaImagen),
          nombreJuego: String(item.nombreJuego),
          numJugadores: String(item.numJugadores)
        }));
      })
    );
  }


}
