import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs/operators';
import { ViajesService } from '../../services/viajes.service';
import { GithubViajesService, FotoParaSubir } from '../../services/github-viajes.service';
import { CommonService } from '../../services/common.service';
import { Bloque, Texto, Viaje, ViajeResumen } from '../../interfaces/viaje.interface';
import { ActivatedRoute, Router } from '@angular/router';

interface FotoGaleriaItem {
  file: File;
  previewUrl: string;
  nombreCorto: string;
  rutaRelativa: string;
}

interface SlotFotoEditable {
  src: string;
  previewUrl: string;
  file?: File;
}

interface BloqueEditable {
  tipo: 'titulo' | 'parrafo' | 'cita' | 'fotos' | 'mapa';
  textoEs: string;
  textoVal: string;
  autorEs: string;
  autorVal: string;
  slots: SlotFotoEditable[];
}

@Component({
  selector: 'app-nuevo-viaje',
  templateUrl: './nuevo-viaje.component.html',
  styleUrls: ['./nuevo-viaje.component.css'],
})
export class NuevoViajeComponent implements OnInit {
  idiomaActivo: 'es' | 'val' | 'ambos' = 'ambos';

  fechaInicio = '2026-06-29';
  fechaFin = '2026-06-29';
  anyo = 2026;
  diaInicio = '29';
  mesInicio = '06';
  diaFin = '29';
  mesFin = '06';

  destino = '';
  categoria = 'Playa';
  provincia = '';
  pais = 'España';
  precio = 0;
  estancia = '';
  tipoEstancia = '';
  transporte: string[] = [];
  personas: string[] = [];

  descPrincipalEs = '';
  descPrincipalVal = '';
  mapa = '';
  infoInteresTexto = '';

  modoEdicion = false;
  private idViajeOriginal = '';
  private archivoOriginal = '';
  private anteriorOriginal = '';
  private siguienteOriginal = '';

  /** Portada del viaje: `{YYYY}/{destino}Principal.jpg` */
  portada = '';
  portadaPreviewUrl = '';
  private portadaFile?: File;

  /** Portada del año (solo si el año no existía aún): `Portada{YYYY}.jpg` */
  esAnyoNuevo = false;
  portadaAnyoRuta = '';
  portadaAnyoPreviewUrl = '';
  protected portadaAnyoFile?: File;

  /** Fotos del viaje (sin incluir portada): `{YYYY}/{destino}1.jpg`, `{YYYY}/{destino}2.jpg`... */
  fotosGaleria: FotoGaleriaItem[] = [];
  fotoSeleccionadaIdx: number | null = null;

  bloquesEditables: BloqueEditable[] = [
    { tipo: 'titulo', textoEs: '', textoVal: '', autorEs: '', autorVal: '', slots: [] },
    { tipo: 'parrafo', textoEs: '', textoVal: '', autorEs: '', autorVal: '', slots: [] },
    {
      tipo: 'fotos',
      textoEs: '',
      textoVal: '',
      autorEs: '',
      autorVal: '',
      slots: [
        { src: '', previewUrl: '' },
        { src: '', previewUrl: '' },
      ],
    },
  ];

  fotosExtraSlots: SlotFotoEditable[] = [{ src: '', previewUrl: '' }];

  readonly transportesDisponibles = [
    'Autobus', 'Avion', 'Barco', 'Barca', 'Bicicleta', 'Coche',
    'Moto', 'Tren', 'Furgoneta', 'Caravana', 'FoodTruck', 'Boda',
  ];

  readonly personasDisponibles = [
    'Alba', 'Albert', 'Mateu', 'Marina', 'Maria', 'Emili', 'Marcel', 'Matilde', 'Pep',
  ];

  nuevoTransporteExtra = '';
  nuevaPersonaExtra = '';
  nuevaPersonaFotoPreviewUrl = '';
  private nuevaPersonaFotoFile?: File;
  private fotosPerfilesNuevos = new Map<string, FotoParaSubir>();

  readonly categoriasDisponibles = ['Playa', 'Montaña', 'Ciudad', 'Nieve'];
  readonly estanciasDisponibles = ['Caravana', 'Apartamento', 'Furgoneta', 'Casa', 'Velero', 'Otros'];
  readonly tiposEstanciaDisponibles = [
    'Furgoneta', 'Airbnb', 'Casa', 'Hotel', 'Apartamento',
    'Bungalow', 'Cabaña', 'Albergue', 'Caravana',
  ];

  readonly OPCION_PERSONALIZADA = '__CUSTOM__';

  categoriaSeleccion = 'Playa';
  categoriaPersonalizada = '';

  estanciaSeleccion = 'Caravana';
  estanciaPersonalizada = '';

  tipoEstanciaSeleccion = 'Airbnb';
  tipoEstanciaPersonalizada = '';

  private anyosExistentes = new Set<number>();
  ultimoViajeResumen?: ViajeResumen;
  guardando = false;
  mensajeEstado = '';
  mensajeError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private viajesService: ViajesService,
    private githubViajesService: GithubViajesService,
    private commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.viajesService.anyos$.pipe(take(1)).subscribe((anyos) => {
      this.anyosExistentes = new Set((anyos ?? []).map((a) => Number(a.anyo)));
      this.evaluarAnyoNuevo();
    });

    this.viajesService.viajes$.pipe(take(1)).subscribe((viajes) => {
      if (viajes && viajes.length > 0) {
        this.ultimoViajeResumen = viajes[viajes.length - 1];
      }
    });

    const estadoNavigation = this.router.getCurrentNavigation()?.extras?.state as { viaje?: Viaje } | undefined;
    const viajeEstado = estadoNavigation?.viaje ?? (history.state?.viaje as Viaje | undefined);
    const paramEditar = this.route.snapshot.queryParamMap.get('editar');

    if (viajeEstado) {
      this.cargarViajeExistente(viajeEstado);
    } else if (paramEditar) {
      this.viajesService.viaje(paramEditar).pipe(take(1)).subscribe((viajeCargado) => {
        if (viajeCargado) {
          this.cargarViajeExistente(viajeCargado);
        }
      });
    }

    this.onCambiarFechas();
  }

  get slugLugar(): string {
    const limpio = (this.destino || 'Lugar')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return limpio || 'Lugar';
  }

  /** Ej. "Isla Tabarca" -> "tabarca", "Canarias" -> "canarias" */
  protected nombreBaseDestino(): string {
    const limpio = (this.destino || 'viaje')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .toLowerCase();

    if (!limpio) {
      return 'viaje';
    }
    const partes = limpio.split(/\s+/);
    return partes.length > 1 ? partes[partes.length - 1] : partes[0];
  }

  private rutaPortadaViaje(): string {
    return `${this.anyo}/${this.nombreBaseDestino()}Principal.jpg`;
  }

  private rutaFotoNumerada(numero: number): string {
    return `${this.anyo}/${this.nombreBaseDestino()}${numero}.jpg`;
  }

  rutaPortadaAnyo(): string {
    return `${this.anyo}/Portada${this.anyo}.jpg`;
  }

  get idViaje(): string {
    const fecha = this.fechaInicio || `${this.anyo}-${this.mesInicio}-${this.diaInicio}`;
    const lugar = (this.destino || 'Lugar').trim();
    return `${fecha}_${lugar}`;
  }

  get nombreArchivoBase(): string {
    const fecha = this.fechaInicio || `${this.anyo}-${this.mesInicio}-${this.diaInicio}`;
    return `${fecha}-${this.slugLugar}`;
  }

  get nombreArchivoJson(): string {
    return `assets/data/viajes/${this.nombreArchivoBase}.json`;
  }

  private evaluarAnyoNuevo(): void {
    this.esAnyoNuevo = !this.anyosExistentes.has(Number(this.anyo));
    this.portadaAnyoRuta = this.rutaPortadaAnyo();
  }

  onCambiarFechas(): void {
    if (this.fechaInicio) {
      const [y, m, d] = this.fechaInicio.split('-');
      this.anyo = Number(y) || new Date().getFullYear();
      this.mesInicio = m || '01';
      this.diaInicio = d || '01';
    }
    if (this.fechaFin) {
      const [, mFin, dFin] = this.fechaFin.split('-');
      this.mesFin = mFin || this.mesInicio;
      this.diaFin = dFin || this.diaInicio;
    }
    this.evaluarAnyoNuevo();
    this.resincronizarRutas();
  }

  onCambiarDestino(): void {
    this.resincronizarRutas();
  }

  private resincronizarRutas(): void {
    this.portadaAnyoRuta = this.rutaPortadaAnyo();

    if (this.portadaFile) {
      this.portada = this.rutaPortadaViaje();
    }

    const base = this.nombreBaseDestino();
    const mapaActualizacion = new Map<string, string>();

    this.fotosGaleria.forEach((f, idx) => {
      const nombre = `${base}${idx + 1}.jpg`;
      const nuevaRuta = `${this.anyo}/${nombre}`;
      mapaActualizacion.set(f.rutaRelativa, nuevaRuta);
      f.rutaRelativa = nuevaRuta;
      f.nombreCorto = nombre;
    });

    for (const b of this.bloquesEditables) {
      for (const s of b.slots) {
        if (s.src && mapaActualizacion.has(s.src)) {
          s.src = mapaActualizacion.get(s.src)!;
        }
      }
    }

    for (const s of this.fotosExtraSlots) {
      if (s.src && mapaActualizacion.has(s.src)) {
        s.src = mapaActualizacion.get(s.src)!;
      }
    }
  }

  private asignarPortadaFile(file: File): void {
    this.portadaFile = file;
    this.portadaPreviewUrl = URL.createObjectURL(file);
    this.portada = this.rutaPortadaViaje();
  }

  private registrarFotoGaleria(file: File): FotoGaleriaItem {
    const existente = this.fotosGaleria.find((f) => f.file === file);
    if (existente) {
      return existente;
    }
    const numero = this.fotosGaleria.length + 1;
    const rutaRelativa = this.rutaFotoNumerada(numero);
    const item: FotoGaleriaItem = {
      file,
      previewUrl: URL.createObjectURL(file),
      nombreCorto: rutaRelativa.split('/').pop() || `foto${numero}.jpg`,
      rutaRelativa,
    };
    this.fotosGaleria.push(item);
    return item;
  }

  onSubirMultiples(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const archivos = Array.from(input.files);
    for (const file of archivos) {
      // La primera imagen seleccionada (si aún no hay portada) va a portadaPreviewUrl -> {destino}Principal.jpg
      if (!this.portadaFile) {
        this.asignarPortadaFile(file);
        continue;
      }

      const item = this.registrarFotoGaleria(file);
      const huecoLibre = this.buscarPrimerHuecoLibre();
      if (huecoLibre) {
        huecoLibre.file = item.file;
        huecoLibre.previewUrl = item.previewUrl;
        huecoLibre.src = item.rutaRelativa;
      } else {
        this.fotosExtraSlots.push({
          file: item.file,
          previewUrl: item.previewUrl,
          src: item.rutaRelativa,
        });
      }
    }
    input.value = '';
  }

  onSubirFotoPortada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.asignarPortadaFile(file);
    input.value = '';
  }

  onSubirFotoPortadaAnyo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.portadaAnyoFile = file;
    this.portadaAnyoPreviewUrl = URL.createObjectURL(file);
    this.portadaAnyoRuta = this.rutaPortadaAnyo();
    input.value = '';
  }

  onSubirFotoEnSlot(event: Event, slot: SlotFotoEditable): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const item = this.registrarFotoGaleria(file);
    slot.file = item.file;
    slot.previewUrl = item.previewUrl;
    slot.src = item.rutaRelativa;
    input.value = '';
  }

  seleccionarFotoBandeja(index: number): void {
    this.fotoSeleccionadaIdx = this.fotoSeleccionadaIdx === index ? null : index;
  }

  asignarSeleccionadaAPortada(): void {
    if (this.fotoSeleccionadaIdx === null) return;
    const item = this.fotosGaleria[this.fotoSeleccionadaIdx];
    if (!item) return;
    this.asignarPortadaFile(item.file);
  }

  asignarSeleccionadaASlot(slot: SlotFotoEditable): void {
    if (this.fotoSeleccionadaIdx === null) return;
    const item = this.fotosGaleria[this.fotoSeleccionadaIdx];
    if (!item) return;
    slot.file = item.file;
    slot.previewUrl = item.previewUrl;
    slot.src = item.rutaRelativa;
  }

  private buscarPrimerHuecoLibre(): SlotFotoEditable | undefined {
    for (const b of this.bloquesEditables) {
      if (b.tipo === 'fotos') {
        const libre = b.slots.find((s) => !s.src);
        if (libre) return libre;
      }
    }
    return this.fotosExtraSlots.find((s) => !s.src);
  }

  agregarBloque(tipo: 'titulo' | 'parrafo' | 'cita' | 'fotos' | 'mapa'): void {
    this.bloquesEditables.push({
      tipo,
      textoEs: '',
      textoVal: '',
      autorEs: '',
      autorVal: '',
      slots: tipo === 'fotos' ? [{ src: '', previewUrl: '' }] : [],
    });
  }

  eliminarBloque(index: number): void {
    this.bloquesEditables.splice(index, 1);
  }

  agregarHuecoFotoBloque(bloque: BloqueEditable): void {
    bloque.slots.push({ src: '', previewUrl: '' });
  }

  agregarHuecoExtra(): void {
    this.fotosExtraSlots.push({ src: '', previewUrl: '' });
  }

  toggleArrayItem(arr: string[], valor: string): void {
    const idx = arr.indexOf(valor);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(valor);
    }
  }

  edadViajero(persona: string): number | null {
    return this.commonService.calcularEdadEnAnyo(
      persona,
      this.anyo,
      parseInt(this.mesInicio, 10) || 1,
      parseInt(this.diaInicio, 10) || 1
    );
  }

  ocultar(evento: Event): void {
    (evento.target as HTMLElement).style.display = 'none';
  }

  private textoOpcional(es: string, val: string): Texto | undefined {
    const obj: Texto = {};
    if (es.trim()) obj['es'] = es.trim();
    if (val.trim()) obj['val'] = val.trim();
    return Object.keys(obj).length ? obj : undefined;
  }

  agregarTransporteExtra(): void {
    const valor = this.nuevoTransporteExtra.trim();
    if (!valor) return;

    const existente = this.transportesDisponibles.find(
      (t) => t.toLowerCase() === valor.toLowerCase()
    );
    const nombreFinal = existente ?? valor;

    if (!existente) {
      this.transportesDisponibles.push(nombreFinal);
    }
    if (!this.transporte.includes(nombreFinal)) {
      this.transporte.push(nombreFinal);
    }
    this.nuevoTransporteExtra = '';
  }

  onSeleccionarFotoNuevaPersona(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.nuevaPersonaFotoFile = file;
    this.nuevaPersonaFotoPreviewUrl = URL.createObjectURL(file);
    input.value = '';
  }

  agregarPersonaExtra(): void {
    const valor = this.nuevaPersonaExtra.trim();
    if (!valor) return;

    const existente = this.personasDisponibles.find(
      (p) => p.toLowerCase() === valor.toLowerCase()
    );
    const nombreFinal = existente ?? valor;

    if (!existente) {
      this.personasDisponibles.push(nombreFinal);
    }
    if (!this.personas.includes(nombreFinal)) {
      this.personas.push(nombreFinal);
    }

    if (this.nuevaPersonaFotoFile) {
      const rutaRelativa = `perfiles/fotoPerfil${nombreFinal}.jpg`;
      this.fotosPerfilesNuevos.set(nombreFinal, {
        rutaRelativa,
        file: this.nuevaPersonaFotoFile,
      });
    }

    this.nuevaPersonaExtra = '';
    this.nuevaPersonaFotoFile = undefined;
    this.nuevaPersonaFotoPreviewUrl = '';
  }

  private resolverCampoConCustom(seleccion: string, personalizada: string): string {
    if (seleccion === this.OPCION_PERSONALIZADA) {
      return personalizada.trim();
    }
    return seleccion.trim();
  }

  private construirViajeJson(): { viaje: Viaje; fotosParaSubir: FotoParaSubir[] } {
    const bloques: Bloque[] = [];
    const fotosEnBloques: string[] = [];
    const fotosMap = new Map<string, FotoParaSubir>();

    const registrarSubida = (ruta: string | undefined, file: File | undefined) => {
      if (ruta && file) {
        fotosMap.set(ruta, { rutaRelativa: ruta, file });
      }
    };

    for (const persona of this.personas) {
      const fotoPerfil = this.fotosPerfilesNuevos.get(persona);
      if (fotoPerfil) {
        registrarSubida(fotoPerfil.rutaRelativa, fotoPerfil.file);
      }
    }

    const rutaPortadaFinal = this.portadaFile ? this.rutaPortadaViaje() : this.portada.trim();
    registrarSubida(rutaPortadaFinal, this.portadaFile);

    if (this.esAnyoNuevo && this.portadaAnyoFile) {
      registrarSubida(this.rutaPortadaAnyo(), this.portadaAnyoFile);
    }

    for (const b of this.bloquesEditables) {
      if (b.tipo === 'titulo' || b.tipo === 'parrafo') {
        const txt = this.textoOpcional(b.textoEs, b.textoVal);
        if (txt) {
          bloques.push({ tipo: b.tipo, texto: txt });
        }
      } else if (b.tipo === 'cita') {
        const txt = this.textoOpcional(b.textoEs, b.textoVal);
        if (txt) {
          const autor = this.textoOpcional(b.autorEs, b.autorVal);
          bloques.push({ tipo: 'cita', texto: txt, ...(autor ? { autor } : {}) });
        }
      } else if (b.tipo === 'fotos') {
        const fotosValidas = b.slots
          .filter((s) => !!s.src.trim())
          .map((s) => {
            registrarSubida(s.src.trim(), s.file);
            fotosEnBloques.push(s.src.trim());
            return { src: s.src.trim() };
          });
        if (fotosValidas.length) {
          bloques.push({ tipo: 'fotos', fotos: fotosValidas });
        }
      } else if (b.tipo === 'mapa') {
        bloques.push({ tipo: 'mapa' });
      }
    }

    const fotosExtra = this.fotosExtraSlots
      .map((s) => {
        if (s.src.trim()) registrarSubida(s.src.trim(), s.file);
        return s.src.trim();
      })
      .filter((src) => !!src);

    const listaFotos = Array.from(new Set([...fotosEnBloques, ...fotosExtra]));

    const idFinal = this.modoEdicion && this.idViajeOriginal ? this.idViajeOriginal : this.idViaje;
    const archivoFinal =
      this.modoEdicion && this.archivoOriginal ? this.archivoOriginal : this.nombreArchivoBase;
    const anteriorFinal = this.modoEdicion ? this.anteriorOriginal : (this.ultimoViajeResumen?.id ?? '');
    const siguienteFinal = this.modoEdicion ? this.siguienteOriginal : '';

    const viaje: Viaje = {
      id: idFinal,
      archivo: archivoFinal,
      anyo: Number(this.anyo),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin || this.fechaInicio,
      diaInicio: this.diaInicio,
      mesInicio: this.mesInicio,
      diaFin: this.diaFin || this.diaInicio,
      mesFin: this.mesFin || this.mesInicio,
      destino: this.destino.trim() || 'Lugar',
      categoria: this.resolverCampoConCustom(this.categoriaSeleccion, this.categoriaPersonalizada),
      provincia: this.provincia.trim(),
      pais: this.pais.trim(),
      precio: Number(this.precio) || 0,
      estancia: this.resolverCampoConCustom(this.estanciaSeleccion, this.estanciaPersonalizada),
      tipoEstancia: this.resolverCampoConCustom(this.tipoEstanciaSeleccion, this.tipoEstanciaPersonalizada),
      transporte: [...this.transporte],
      personas: [...this.personas],
      portada: rutaPortadaFinal,
      fotos: listaFotos,
      numFotos: listaFotos.length,
      anterior: anteriorFinal,
      siguiente: siguienteFinal,
      mapa: this.mapa.trim(),
      infoInteres: this.infoInteresTexto
        .split(',')
        .map((u) => u.trim())
        .filter((u) => !!u),
      ...(this.textoOpcional(this.descPrincipalEs, this.descPrincipalVal)
        ? { descPrincipal: this.textoOpcional(this.descPrincipalEs, this.descPrincipalVal) }
        : {}),
      bloques,
      fotosExtra,
    };

    return { viaje, fotosParaSubir: Array.from(fotosMap.values()) };
  }

  guardarEnGitHub(): void {
    this.mensajeError = '';
    this.mensajeEstado = '';

    if (!this.destino.trim()) {
      this.mensajeError = 'Indica al menos el destino del viaje.';
      return;
    }

    if (this.esAnyoNuevo && !this.portadaAnyoFile) {
      this.mensajeError = `El año ${this.anyo} es nuevo: sube la foto de portada ${this.rutaPortadaAnyo()} antes de publicar.`;
      return;
    }

    this.guardando = true;
    const { viaje, fotosParaSubir } = this.construirViajeJson();

    const peticion$ = this.modoEdicion
      ? this.githubViajesService.guardarEdicionViaje(viaje, fotosParaSubir, (estado) => {
          this.mensajeEstado = estado;
        })
      : this.githubViajesService.publicarViaje(viaje, this.ultimoViajeResumen, fotosParaSubir, (estado) => {
          this.mensajeEstado = estado;
        });

    peticion$.subscribe({
      next: () => {
        this.guardando = false;
        this.mensajeEstado = this.modoEdicion
          ? `Cambios del viaje "${viaje.destino}" guardados en ${viaje.archivo}.json.`
          : `Viaje "${viaje.destino}" publicado como ${this.nombreArchivoBase}.json y viaje anterior actualizado.`;
      },
      error: (err) => {
        this.guardando = false;
        this.mensajeError = err?.message || 'Error al guardar el viaje en GitHub.';
      },
    });
  }

  private cargarViajeExistente(viaje: Viaje): void {
    this.modoEdicion = true;
    this.idViajeOriginal = viaje.id;
    this.archivoOriginal = viaje.archivo;
    this.anteriorOriginal = viaje.anterior ?? '';
    this.siguienteOriginal = viaje.siguiente ?? '';

    this.fechaInicio = viaje.fechaInicio || this.fechaInicio;
    this.fechaFin = viaje.fechaFin || this.fechaInicio;
    this.anyo = Number(viaje.anyo) || this.anyo;
    this.diaInicio = viaje.diaInicio || this.diaInicio;
    this.mesInicio = viaje.mesInicio || this.mesInicio;
    this.diaFin = viaje.diaFin || this.diaFin;
    this.mesFin = viaje.mesFin || this.mesFin;

    this.destino = viaje.destino || '';
    this.provincia = viaje.provincia || '';
    this.pais = viaje.pais || 'España';
    this.precio = Number(viaje.precio) || 0;
    this.mapa = viaje.mapa || '';
    this.infoInteresTexto = (viaje.infoInteres ?? []).join(', ');

    this.descPrincipalEs = viaje.descPrincipal?.['es'] ?? '';
    this.descPrincipalVal = viaje.descPrincipal?.['val'] ?? '';

    // Selectores con soporte a opción personalizada
    if (this.categoriasDisponibles.includes(viaje.categoria)) {
      this.categoriaSeleccion = viaje.categoria;
      this.categoriaPersonalizada = '';
    } else if (viaje.categoria) {
      this.categoriaSeleccion = this.OPCION_PERSONALIZADA;
      this.categoriaPersonalizada = viaje.categoria;
    }

    if (this.estanciasDisponibles.includes(viaje.estancia)) {
      this.estanciaSeleccion = viaje.estancia;
      this.estanciaPersonalizada = '';
    } else if (viaje.estancia) {
      this.estanciaSeleccion = this.OPCION_PERSONALIZADA;
      this.estanciaPersonalizada = viaje.estancia;
    }

    if (this.tiposEstanciaDisponibles.includes(viaje.tipoEstancia)) {
      this.tipoEstanciaSeleccion = viaje.tipoEstancia;
      this.tipoEstanciaPersonalizada = '';
    } else if (viaje.tipoEstancia) {
      this.tipoEstanciaSeleccion = this.OPCION_PERSONALIZADA;
      this.tipoEstanciaPersonalizada = viaje.tipoEstancia;
    }

    // Transporte y personas (asegurando que existan en los arrays disponibles)
    this.transporte = [...(viaje.transporte ?? [])];
    for (const t of this.transporte) {
      if (!this.transportesDisponibles.includes(t)) {
        this.transportesDisponibles.push(t);
      }
    }

    this.personas = [...(viaje.personas ?? [])];
    for (const p of this.personas) {
      if (!this.personasDisponibles.includes(p)) {
        this.personasDisponibles.push(p);
      }
    }

    // Portada existente
    this.portada = viaje.portada || '';
    this.portadaPreviewUrl = viaje.portada ? `assets/images/${viaje.portada}` : '';
    this.portadaFile = undefined;

    // Bloques existentes
    if (viaje.bloques?.length) {
      this.bloquesEditables = viaje.bloques.map((b): BloqueEditable => {
        if (b.tipo === 'fotos') {
          return {
            tipo: 'fotos',
            textoEs: '',
            textoVal: '',
            autorEs: '',
            autorVal: '',
            slots: (b.fotos ?? []).map((f) => ({
              src: f.src,
              previewUrl: f.src ? `assets/images/${f.src}` : '',
            })),
          };
        }

        const bloqueConTexto = b as Extract<typeof b, { texto?: Record<string, string> }>;
        const bloqueConAutor = b as Extract<typeof b, { autor?: Record<string, string> }>;

        let tipoEditable: BloqueEditable['tipo'] = 'parrafo';
        if (b.tipo === 'titulo' || b.tipo === 'subtitulo') {
          tipoEditable = 'titulo';
        } else if (b.tipo === 'cita') {
          tipoEditable = 'cita';
        } else if (b.tipo === 'mapa') {
          tipoEditable = 'mapa';
        } else if (b.tipo === 'parrafo' || b.tipo === 'nota' || b.tipo === 'lista') {
          tipoEditable = 'parrafo';
        }

        return {
          tipo: tipoEditable,
          textoEs: bloqueConTexto.texto?.['es'] ?? '',
          textoVal: bloqueConTexto.texto?.['val'] ?? '',
          autorEs: b.tipo === 'cita' ? (bloqueConAutor.autor?.['es'] ?? '') : '',
          autorVal: b.tipo === 'cita' ? (bloqueConAutor.autor?.['val'] ?? '') : '',
          slots: [],
        };
      });
    }

    // Fotos extra existentes
    this.fotosExtraSlots = (viaje.fotosExtra ?? []).length
      ? (viaje.fotosExtra ?? []).map((src) => ({
          src,
          previewUrl: src ? `assets/images/${src}` : '',
        }))
      : [{ src: '', previewUrl: '' }];

    this.evaluarAnyoNuevo();
  }
}
