import { Component, OnDestroy, OnInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import { Cluster, Vector as VectorSource, XYZ } from 'ol/source';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';

import { LocalizacionesService } from 'src/app/services/localizaciones.service';
import { CommonService } from 'src/app/services/common.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

export interface ViajeroDetalle {
  nombre: string;
  foto: string;
  edad: number | null;
}

export interface DetalleUbicacion {
  pais: string;
  anyo: string;
  viajeros: ViajeroDetalle[];
  descripcion: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy {

  public map!: Map | null;
  public fuentePuntos = new VectorSource<Feature<Point>>();
  public fuenteCluster = new Cluster({
    distance: 45,
    minDistance: 20,
    source: this.fuentePuntos
  });
  public clusterLayer = new VectorLayer({
    source: this.fuenteCluster,
    style: (feature) => this.estiloCluster(feature as Feature<Point>)
  });

  detalleSeleccionado: DetalleUbicacion | null = null;
  totalMostrados: number = 0;

  destroy$: Subject<void> = new Subject<void>();
  finCargaPaises: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  coordenadasIniciales: [number, number];
  filtro: string = '';

  paisesVisitados: { [key: string]: number } = {};
  dataGrafica: { country: string, visits: number }[] = [];
  tipoGrafico: string = 'barras';

  totalPaisesVisitados: number = 0;
  totalVisitasGlobales: number = 0;

  constructor(
    public servicioLocalizaciones: LocalizacionesService,
    private commonService: CommonService
  ) {
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
      this.calcularEstadisticas(localizaciones);

      const features = localizaciones.map(loc => this.getFeature(loc));
      this.totalMostrados = features.length;
      this.fuentePuntos.clear();
      this.fuentePuntos.addFeatures(features);

      if (!this.map) {
        this.map = new Map({
          layers: [
            new TileLayer({
              source: new XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attributions: ''
              })
            }),
            this.clusterLayer
          ],
          target: 'map',
          view: new View({
            center: fromLonLat(localizaciones[0].coordinates),
            zoom: 4
          }),
          controls: []
        });

        this.map.on('click', (event) => {
          const hit = this.map!.forEachFeatureAtPixel(event.pixel, (feature) => feature);
          if (!hit) {
            return;
          }

          const miembros: Feature<Point>[] = hit.get('features') ?? [];
          if (miembros.length > 1) {
            const geom = hit.getGeometry() as Point;
            const vista = this.map!.getView();
            const zoomActual = vista.getZoom() ?? 4;
            vista.animate({
              center: geom.getCoordinates(),
              zoom: Math.min(zoomActual + 2, 16),
              duration: 350
            });
            return;
          }

          const origen = miembros[0] ?? hit;
          const anyoStr = String(origen.get('año') ?? '');
          const personaRaw = String(origen.get('persona') ?? '');
          const mes = origen.get('mes') as number | undefined;
          const dia = origen.get('dia') as number | undefined;

          this.detalleSeleccionado = {
            pais: String(origen.get('pais') ?? ''),
            anyo: anyoStr,
            viajeros: this.construirViajeros(personaRaw, anyoStr, mes, dia),
            descripcion: String(origen.get('descripcion') ?? '')
          };
        });
      }

      this.finCargaPaises.next(true);
      this.servicioLocalizaciones.cargandoLocalizaciones$.next(false);
    });
  }

  private construirViajeros(personaRaw: string, anyoStr: string, mes?: number, dia?: number): ViajeroDetalle[] {
    const anyoNum = parseInt(anyoStr, 10);
    const limpio = personaRaw.trim();

    let nombres: string[];
    if (!limpio || limpio.toLowerCase() === 'todos') {
      nombres = [...this.commonService.nombresFamilia];
    } else {
      nombres = limpio
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
    }

    return nombres.map((nombre) => {
      const clave = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
      const edad = !Number.isNaN(anyoNum)
        ? this.commonService.calcularEdadEnAnyo(clave, anyoNum, mes, dia)
        : null;

      return {
        nombre: clave,
        foto: `assets/images/perfiles/fotoPerfil${clave}.jpg`,
        edad
      };
    });
  }

  ocultarFotoPerfil(evento: Event): void {
    (evento.target as HTMLElement).style.display = 'none';
  }

  private estiloCluster(feature: Feature<Point>): Style {
    const miembros: Feature<Point>[] = feature.get('features') ?? [];
    const cantidad = miembros.length;

    if (cantidad <= 1) {
      return new Style({
        image: new Icon({
          src: 'assets/icons/ubicacionAmarillo.png',
          scale: 0.048,
          rotation: 0
        })
      });
    }

    return new Style({
      image: new CircleStyle({
        radius: cantidad >= 10 ? 20 : 16,
        fill: new Fill({ color: 'rgba(245, 158, 11, 0.92)' }),
        stroke: new Stroke({ color: '#ffffff', width: 3 })
      }),
      text: new Text({
        text: String(cantidad),
        fill: new Fill({ color: '#ffffff' }),
        font: 'bold 13px Arial, sans-serif'
      })
    });
  }

  private calcularEstadisticas(localizaciones: any[]): void {
    this.paisesVisitados = {};
    for (const loc of localizaciones) {
      const pais = String(loc.pais ?? '');
      if (!pais) continue;
      this.paisesVisitados[pais] = (this.paisesVisitados[pais] ?? 0) + 1;
    }
    this.dataGrafica = Object.entries(this.paisesVisitados).map(([country, visits]) => ({ country, visits }));
    this.totalPaisesVisitados = Object.keys(this.paisesVisitados).length;
    this.totalVisitasGlobales = Object.values(this.paisesVisitados).reduce((a, b) => a + b, 0);
  }

  getFeature(loc: any): Feature<Point> {
    return new Feature({
      geometry: new Point(fromLonLat(loc.coordinates)),
      persona: loc.personas,
      año: loc.año,
      mes: loc.mes,
      dia: loc.dia,
      descripcion: loc.descripcion,
      pais: loc.pais
    });
  }

  cerrarPopover(): void {
    this.detalleSeleccionado = null;
  }

  centrarMapa(): void {
    if (!this.map) return;
    const initialCenter = fromLonLat(this.coordenadasIniciales);
    this.map.getView().animate({
      center: initialCenter,
      rotation: 0,
      zoom: 4,
      duration: 450
    });
    this.cerrarPopover();
  }

  destruirMapa(): void {
    if (this.map) {
      this.map.setTarget(undefined);
      this.map = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  limpiarFiltro(): void {
    this.filtro = '';
    this.buscar();
  }

  buscar(): void {
    this.servicioLocalizaciones.getLocations().pipe(takeUntil(this.destroy$)).subscribe((localizaciones) => {
      const termino = this.filtro.trim().toLowerCase();
      const filtradas: Feature<Point>[] = [];

      localizaciones.forEach(loc => {
        const feature = this.getFeature(loc);
        const coincide =
          termino === '' ||
          String(feature.get('año') ?? '').toLowerCase().includes(termino) ||
          String(feature.get('persona') ?? '').toLowerCase().includes(termino) ||
          String(feature.get('descripcion') ?? '').toLowerCase().includes(termino) ||
          String(feature.get('pais') ?? '').toLowerCase().includes(termino);

        if (coincide) {
          filtradas.push(feature);
        }
      });

      this.fuentePuntos.clear();
      this.fuentePuntos.addFeatures(filtradas);
      this.totalMostrados = filtradas.length;
      this.map?.updateSize();
      this.servicioLocalizaciones.cargandoLocalizaciones$.next(false);
    });
  }

  cambiaGrafico(valor: string): void {
    this.tipoGrafico = valor;
  }
}
