import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import { OSM, Vector as VectorSource } from 'ol/source';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import { LocalizacionesService } from 'src/app/services/localizaciones.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {

  public map!: Map;
  personas = ['Mateu', 'Marina', 'Alba', 'Albert', 'Todos', 'Mateu-Alba-Albert', 'Alba-Albert' ]; // Suponiendo que estas son tus personas
  colores: { [key: string]: string } = {
    'Mateu': 'red',
    'Marina': 'pink',
    'Alba': 'blue',
    'Albert': 'green',
    'Todos': 'yellow',
    'Mateu-Alba-Albert': 'brown',
    'Alba-Albert': 'orange'
  };

  constructor(public servicioLocalizaciones: LocalizacionesService) { }

  ngOnInit(): void {

    this.servicioLocalizaciones.getLocations().subscribe((localizaciones) => {

      this.map = new Map({
        layers: [
          new TileLayer({
            source: new OSM({
              // Desactivar el control de atribución para quitar la marca de agua
              attributions: ''
            }),
          }),
          new VectorLayer({
            source: new VectorSource({
              features: localizaciones.map(loc => {
                const feature = new Feature({
                  geometry: new Point(fromLonLat(loc.coordinates)),
                  persona: loc.personas, // Asignar la persona a la propiedad 'persona' del Feature
                  año: loc.año,
                  lugar: loc.lugar
                });

                // Aplicar estilo al círculo según la persona
                feature.setStyle(new Style({
                  image: new CircleStyle({
                    radius: 3,
                    fill: new Fill({ color: this.colores[loc.personas] }) // Usar el color asociado a la persona
                  })
                }));

                return feature;
              })
            })
          })
        ],
        target: 'map',
        view: new View({
          center: fromLonLat(localizaciones[0].coordinates), // Centra el mapa en la primera coordenada
          zoom: 4
        }),
        // Desactivar los controles de zoom
        controls: []
      });
      this.servicioLocalizaciones.cargandoLocalizaciones$.next(false);
    });
  }
}
