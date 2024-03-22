import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocalizacionesService {

  jsonLocalizaciones = "assets/data/localizaciones.json";

  cargandoLocalizaciones$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  constructor(private http: HttpClient, public translate : TranslateService) {

  }

  getLocations(): Observable<{ coordinates: [number, number], personas: string, año: string, lugar:string}[]> {
    this.cargandoLocalizaciones$.next(true);

    return this.http.get<any[]>(this.jsonLocalizaciones).pipe(
      map((data: any[]) => {
        // Mapear cada objeto del JSON a un objeto con coordenadas y persona
        return data.map(item => ({
          coordinates: item.coordinates,
          personas: item.personas,
          año: item.año,
          lugar: item.lugar
        }));
      })
    );
  }
}
