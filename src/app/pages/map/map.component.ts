import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import { OSM, Vector as VectorSource } from 'ol/source';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { Feature, Overlay } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import { Coordinate } from 'ol/coordinate';

import { LocalizacionesService } from 'src/app/services/localizaciones.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {

  public map!: Map;
  public vectorLayer = new VectorLayer();
  personas = ['Mateu', 'Marina', 'Alba', 'Albert', 'Todos', 'Mateu,Alba,Albert', 'Alba,Albert' ]; // Suponiendo que estas son tus personas
  colores: { [key: string]: string } = {
    'Mateu': 'red',
    'Marina': 'pink',
    'Alba': 'blue',
    'Albert': 'green',
    'Todos': 'yellow',
    'Mateu,Alba,Albert': 'brown',
    'Alba,Albert': 'orange'
  };

  overlay!: Overlay;

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

          this.vectorLayer = new VectorLayer({
            source: new VectorSource({
              features: localizaciones.map(loc => {
                const feature = new Feature({
                  geometry: new Point(fromLonLat(loc.coordinates)),
                  persona: loc.personas, // Asignar la persona a la propiedad 'persona' del Feature
                  año: loc.año,
                  descripcion: loc.descripcion
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

      this.overlay = new Overlay({
        element: document.getElementById('tooltip')!,
        autoPan: true
      });
      this.map.addOverlay(this.overlay);

      // Escuchar evento de clic en el mapa para mostrar el tooltip
      const radiusDegrees = 200; // Por ejemplo, aproximadamente 200 kilómetro en latitud/longitud


      this.map.on('click', (event) => {
      const pixel = event.pixel;
      const coordinate = this.map.getCoordinateFromPixel(pixel);

      // Iterar sobre las características del vector en el radio especificado
      this.map.forEachFeatureAtPixel(pixel, (feature) => {
        if (feature) {
            const geometry = feature.getGeometry();

            if (geometry instanceof Point) {
              const featureCoord = geometry.getCoordinates();
              const distance = this.calculateDistance(coordinate, featureCoord);

              // Verificar si la característica está dentro del radio definido
              if (distance <= radiusDegrees) {
                const tooltipElement = this.overlay.getElement();
                tooltipElement!.innerHTML = `
                  <div><strong>Viajeros:</strong> ${feature.get('persona')}</div>
                  <div><strong>Año:</strong> ${feature.get('año')}</div>
                  <div><strong>Descripción:</strong> ${feature.get('descripcion')}</div>
                `;
                // <button class="buttonTooltip" (click)="buttonCloseTooltip()">CERRAR</button>
                this.overlay.setPosition(featureCoord);
              }
            }
          }
        });
      });

      this.servicioLocalizaciones.cargandoLocalizaciones$.next(false);

    });
  }

  // Función para calcular la distancia entre dos coordenadas
  calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  // buttonCloseTooltip(){
  //   debugger
  //   this.overlay.setPosition(undefined);
  // }

}
