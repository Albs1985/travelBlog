import { Component, OnDestroy, OnInit } from '@angular/core';
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



import { LocalizacionesService } from 'src/app/services/localizaciones.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import Icon from 'ol/style/Icon';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy {

  public map!: Map |null;
  public vectorLayer = new VectorLayer();
  overlay!: Overlay;


  destroy$: Subject<void> = new Subject<void>();
  finCargaPaises: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  personas = ['Mateu', 'Marina', 'Alba', 'Albert', 'Todos', 'Mateu,Alba,Albert', 'Alba,Albert' ];
  colores: { [key: string]: string } = {
    'Mateu': 'red',
    'Marina': 'pink',
    'Alba': 'blue',
    'Albert': 'green',
    'Todos': 'yellow',
    'Mateu,Alba,Albert': 'brown',
    'Alba,Albert': 'orange'
  };

  coordenadasIniciales: [number, number];

  filtro: string = '';

  paisesVisitados: { [key: string]: number } = {};
  dataGrafica: { country: string, visits: number }[] = Object.entries(this.paisesVisitados).map(([country, visits]) => ({ country, visits }));
  tipoGrafico: string = 'barras';

  constructor(public servicioLocalizaciones: LocalizacionesService) {
    this.coordenadasIniciales = [0,0];
  }

  ngOnInit(): void {
    this.crearMapa();
  }

  ngOnDestroy(): void {
    this.destruirMapa();
  }


  crearMapa(): void {

    this.servicioLocalizaciones.getLocations().pipe(takeUntil(this.destroy$)).subscribe((localizaciones) => {

      this.coordenadasIniciales = localizaciones[0].coordinates;

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
                return this.getFeature(loc);
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

      this.map.on('click', (event) => {
      const pixel = event.pixel;

      if (this.overlay){
        this.overlay.setPosition(undefined);
      }

      // Iterar sobre las características del vector en el radio especificado
      this.map!.forEachFeatureAtPixel(pixel, (feature) => {
        if (feature) {
            const geometry = feature.getGeometry();

            if (geometry instanceof Point) {
              const featureCoord = geometry.getCoordinates();
              const tooltipElement = this.overlay.getElement();
              tooltipElement!.innerHTML = `
                <div><strong>Viajeros:</strong> ${feature.get('persona')}</div>
                <div><strong>Año:</strong> ${feature.get('año')}</div>
                <div><strong>Descripción:</strong> ${feature.get('descripcion')}</div>
              `;

              this.overlay.setPosition(featureCoord);
              // }
            }
          }
        });
      });

      this.dataGrafica = Object.entries(this.paisesVisitados).map(([country, visits]) => ({ country, visits }));
      this.finCargaPaises.next(true);
      this.servicioLocalizaciones.cargandoLocalizaciones$.next(false);

    });
  }


  getFeature(loc : any){

    const feature = new Feature({
      geometry: new Point(fromLonLat(loc.coordinates)),
      persona: loc.personas, // Asignar la persona a la propiedad 'persona' del Feature
      año: loc.año,
      descripcion: loc.descripcion,
      pais: loc.pais
    });

    this.actualizarVisitas(String(feature.get('pais')));

    // Aplicar estilo al círculo según la persona
    feature.setStyle(new Style({
      // image: new CircleStyle({
      //   radius: 5,
        // fill: new Fill({ color: this.colores[loc.personas] }) // Usar el color asociado a la persona
      //   fill: new Fill({ color: 'red' }) // Usar el color FIJO
      // })
      image: new Icon({
        src: 'assets/icons/ubicacionAmarillo.png',
        scale: 0.045,
        rotation: 0
      })
    }));
    return feature;
  }

  buttonCloseTooltip(){
    this.overlay.setPosition(undefined);
  }

  actualizarVisitas(pais: string): void {
    if (this.paisesVisitados[pais] !== undefined) {
      // Si el país ya está en el mapa, se incrementa el contador de visitas
      this.paisesVisitados[pais]++;
    } else {
      // Si el país no está en el mapa, se agrega con un contador de visitas inicializado en 1
      this.paisesVisitados[pais] = 1;
    }
  }

  centrarMapa(): void {
    const initialCenter = fromLonLat(this.coordenadasIniciales);
    this.map!.getView().setCenter(initialCenter);
    this.map!.getView().setRotation(0);
    this.map!.getView().setZoom(4);
    if (this.overlay){
      this.overlay.setPosition(undefined);
    }
  }


  destruirMapa(): void {
    if (this.map) {
      this.map.setTarget(undefined);
      this.map = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  buscar(): void {
    this.servicioLocalizaciones.getLocations().pipe(takeUntil(this.destroy$)).subscribe((localizaciones) => {
      // Limpiar la capa vectorial para eliminar todas las características del mapa actual
      this.vectorLayer.getSource()!.clear();

      // Filtrar y agregar características según los criterios de búsqueda
      localizaciones.forEach(loc => {
        const feature = this.getFeature(loc);
        if (this.filtro.trim() === '' ||
            String(feature.get('año')).toLowerCase().includes(this.filtro.toLowerCase()) ||
            String(feature.get('persona')).toLowerCase().includes(this.filtro.toLowerCase()) ||
            String(feature.get('descripcion')).toLowerCase().includes(this.filtro.toLowerCase())) {
          this.vectorLayer.getSource()!.addFeature(feature);
        }
      });

      // Actualizar el mapa
      this.map!.updateSize();

      this.servicioLocalizaciones.cargandoLocalizaciones$.next(false);
    });
  }


  cambiaGrafico(valor: string){
    if (valor === 'barras'){
      this.tipoGrafico = 'barras';
    }else if (valor === 'tarta'){
      this.tipoGrafico = 'tarta';
    }else if (valor === 'burbuja'){
      this.tipoGrafico = 'burbuja';
    }
  }
}
