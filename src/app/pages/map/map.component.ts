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
import Icon from 'ol/style/Icon';

import { LocalizacionesService } from 'src/app/services/localizaciones.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy {

  public map!: Map | null;
  public vectorLayer = new VectorLayer();
  overlay!: Overlay;

  destroy$: Subject<void> = new Subject<void>();
  finCargaPaises: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  personas = ['Mateu', 'Marina', 'Alba', 'Albert', 'Todos', 'Mateu,Alba,Albert', 'Alba,Albert'];
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
  dataGrafica: { country: string, visits: number }[] = [];
  tipoGrafico: string = 'barras'; // 'barras' o 'resumen'

  totalPaisesVisitados: number = 0;
  totalVisitasGlobales: number = 0;

  constructor(public servicioLocalizaciones: LocalizacionesService) {
    this.coordenadasIniciales = [0, 0];
  }

  ngOnInit(): void {
    this.crearMapa();
  }

  ngOnDestroy(): void {
    this.destruirMapa();
  }

  crearMapa(): void {
    this.servicioLocalizaciones.getLocations().pipe(takeUntil(this.destroy$)).subscribe((localizaciones) => {

      if (!localizaciones || localizaciones.length === 0) {
        this.servicioLocalizaciones.cargandoLocalizaciones$.next(false);
        this.finCargaPaises.next(true);
        return;
      }

      this.coordenadasIniciales = localizaciones[0].coordinates;
      this.paisesVisitados = {}; // Reiniciar contador

      this.map = new Map({
        layers: [
          new TileLayer({
            source: new OSM({ attributions: '' }),
          }),
          this.vectorLayer = new VectorLayer({
            source: new VectorSource({
              features: localizaciones.map(loc => this.getFeature(loc))
            })
          })
        ],
        target: 'map',
        view: new View({
          center: fromLonLat(localizaciones[0].coordinates),
          zoom: 4
        }),
        controls: []
      });

      this.overlay = new Overlay({
        element: document.getElementById('tooltip')!,
        autoPan: true
      });
      this.map.addOverlay(this.overlay);

      this.map.on('click', (event) => {
        const pixel = event.pixel;
        if (this.overlay) {
          this.overlay.setPosition(undefined);
        }

        this.map!.forEachFeatureAtPixel(pixel, (feature) => {
          if (feature) {
            const geometry = feature.getGeometry();
            if (geometry instanceof Point) {
              const featureCoord = geometry.getCoordinates();
              const tooltipElement = this.overlay.getElement();

              if (tooltipElement) {
                tooltipElement.innerHTML = `
                  <div class="popup-card-content">
                    <div class="popup-header">
                      <span class="popup-tag">📍 ${feature.get('pais')}</span>
                      <span class="popup-year">🗓️ ${feature.get('año')}</span>
                    </div>
                    <div class="popup-travelers">
                      <strong>Viajeros:</strong> ${feature.get('persona')}
                    </div>
                    <p class="popup-desc">${feature.get('descripcion')}</p>
                    <span class="popup-close-hint">Haz clic para cerrar</span>
                  </div>
                `;
              }
              this.overlay.setPosition(featureCoord);
            }
          }
        });
      });

      // Calcular datos para gráficos y estadísticas
      this.dataGrafica = Object.entries(this.paisesVisitados).map(([country, visits]) => ({ country, visits }));
      this.totalPaisesVisitados = Object.keys(this.paisesVisitados).length;
      this.totalVisitasGlobales = Object.values(this.paisesVisitados).reduce((a, b) => a + b, 0);

      this.finCargaPaises.next(true);
      this.servicioLocalizaciones.cargandoLocalizaciones$.next(false);
    });
  }

  getFeature(loc: any) {
    const feature = new Feature({
      geometry: new Point(fromLonLat(loc.coordinates)),
      persona: loc.personas,
      año: loc.año,
      descripcion: loc.descripcion,
      pais: loc.pais
    });

    this.actualizarVisitas(String(feature.get('pais')));

    feature.setStyle(new Style({
      image: new Icon({
        src: 'assets/icons/ubicacionAmarillo.png',
        scale: 0.045,
        rotation: 0
      })
    }));
    return feature;
  }

  buttonCloseTooltip() {
    if (this.overlay) {
      this.overlay.setPosition(undefined);
    }
  }

  actualizarVisitas(pais: string): void {
    if (this.paisesVisitados[pais] !== undefined) {
      this.paisesVisitados[pais]++;
    } else {
      this.paisesVisitados[pais] = 1;
    }
  }

  centrarMapa(): void {
    if (!this.map) return;
    const initialCenter = fromLonLat(this.coordenadasIniciales);
    this.map.getView().setCenter(initialCenter);
    this.map.getView().setRotation(0);
    this.map.getView().setZoom(4);
    if (this.overlay) {
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
      this.vectorLayer.getSource()!.clear();

      localizaciones.forEach(loc => {
        const feature = this.getFeature(loc);
        if (this.filtro.trim() === '' ||
            String(feature.get('año')).toLowerCase().includes(this.filtro.toLowerCase()) ||
            String(feature.get('persona')).toLowerCase().includes(this.filtro.toLowerCase()) ||
            String(feature.get('descripcion')).toLowerCase().includes(this.filtro.toLowerCase()) ||
            String(feature.get('pais')).toLowerCase().includes(this.filtro.toLowerCase())) {
          this.vectorLayer.getSource()!.addFeature(feature);
        }
      });

      this.map!.updateSize();
      this.servicioLocalizaciones.cargandoLocalizaciones$.next(false);
    });
  }

  cambiaGrafico(valor: string) {
    this.tipoGrafico = valor;
  }
}
