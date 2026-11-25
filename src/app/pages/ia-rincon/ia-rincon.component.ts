import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import {
  FUENTES_CUENTO_LIBRE,
  FUENTES_CUENTO_SOLO_PERSONAJES,
  FuentesCuentoConfig,
  IdiomaIa,
  IaFamiliaService
} from '../../services/ia-familia.service';
import { finalize, of, catchError, map, Subscription, Observable, forkJoin, switchMap } from 'rxjs';
import { jsPDF } from 'jspdf';
import { CommonService } from 'src/app/services/common.service';
import { AutenticationService } from 'src/app/services/autentication.service';

export interface MensajeChatFamilia {
  remitente: 'usuario' | 'ia';
  texto: string;
  hora: string;
  proveedor?: string;
}

export interface SegmentoTextoChat {
  texto: string;
  negrita: boolean;
}

export interface CuentoGuardadoItem {
  nombreArchivo: string;
  titulo: string;
  fecha: string;
  downloadUrl?: string;
  pdfBase64?: string;
  miniaturaUrl?: string;
}

interface ImagenComprimida {
  dataUrl: string;
  width: number;
  height: number;
}

@Component({
  selector: 'app-ia-rincon',
  templateUrl: './ia-rincon.component.html',
  styleUrls: ['./ia-rincon.component.css']
})
export class IaRinconComponent implements OnInit, OnDestroy {
  modo: 'familia' | 'cuento' | 'biblioteca' = 'cuento';

  // Por defecto: 100 % libre (ningún JSON marcado)
  fuentesCuento: FuentesCuentoConfig = { ...FUENTES_CUENTO_LIBRE };

  apiKeyInput = '';
  // claveGuardada = false;
  mostrarPanelToken = false;

  consulta = '';
  mensajesChat: MensajeChatFamilia[] = [];

  // Modo Cuentos: 3 ilustraciones (inicio, medio, final) + skeletons
  tituloCuento = '';
  parrafosCuento: string[] = [];
  mostrarHuecoImagen = true;
  estiloCuentoNombre = '';
  private estiloCuentoPrompt = '';

  imagenesCuento: Array<string | null> = [null, null, null];
  cargandoImagenes: boolean[] = [false, false, false];
  imagenCuentoUrl: string | null = null;
  cargandoImagenCuento = false;
  cargandoPuter = false;

  // Guardado PDF con jsPDF y GitHub + Biblioteca de PDFs
  generandoPdf = false;
  guardandoGithub = false;
  mensajeEstadoPdf = '';
  cuentosGuardados: CuentoGuardadoItem[] = [];
  cargandoBiblioteca = false;

  private subIlustraciones?: Subscription;

  cargando = false;
  errorMsg = '';

  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';
  private readonly repoBranch = 'main';
  private readonly carpetaCuentosPdfRepo = 'src/assets/cuentos-pdf';
  private readonly carpetaCuentosPdfDocsRepo = 'docs/assets/cuentos-pdf';

  readonly sugerenciasFamilia = [
    'iaRincon.sugerenciaFamilia1',
    'iaRincon.sugerenciaFamilia2',
    'iaRincon.sugerenciaFamilia3'
  ];

  readonly sugerenciasCuento = [
    'iaRincon.sugerenciaCuento1',
    'iaRincon.sugerenciaCuento2',
    'iaRincon.sugerenciaCuento3'
  ];

  proveedoresImagenesCuento: Array<string | null> = [null, null, null];

  private esImagenRealIa: boolean[] = [false, false, false];

  constructor(
    private iaService: IaFamiliaService,
    private translate: TranslateService,
    private commonService: CommonService,
    protected autenticationService: AutenticationService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.apiKeyInput = this.iaService.obtenerApiKey();
    this.commonService.claveGuardada = this.iaService.tieneApiKey();
    this.iaService.limpiarCacheContexto();
  }

  ngOnDestroy(): void {
    this.subIlustraciones?.unsubscribe();
  }

  get indiceMitadCuento(): number {
    return Math.max(1, Math.floor(this.parrafosCuento.length / 2));
  }

  get esModoCuentoLibre(): boolean {
    return (
      !this.fuentesCuento.personajes &&
      !this.fuentesCuento.viajeros &&
      !this.fuentesCuento.cumpleanyos &&
      !this.fuentesCuento.frases &&
      !this.fuentesCuento.viajes
    );
  }

  get esSoloPersonajes(): boolean {
    return (
      this.fuentesCuento.personajes &&
      !this.fuentesCuento.viajeros &&
      !this.fuentesCuento.cumpleanyos &&
      !this.fuentesCuento.frases &&
      !this.fuentesCuento.viajes
    );
  }

  alternarFuenteCuento(campo: keyof FuentesCuentoConfig): void {
    this.fuentesCuento = {
      ...this.fuentesCuento,
      [campo]: !this.fuentesCuento[campo]
    };
  }

  aplicarModoLibreCuento(): void {
    this.fuentesCuento = { ...FUENTES_CUENTO_LIBRE };
  }

  aplicarSoloPersonajesCuento(): void {
    this.fuentesCuento = { ...FUENTES_CUENTO_SOLO_PERSONAJES };
  }

  obtenerSegmentosChat(msg: MensajeChatFamilia): SegmentoTextoChat[] {
    return this.parsearSegmentosChat(msg?.texto ?? '');
  }

  private parsearSegmentosChat(texto: string): SegmentoTextoChat[] {
    if (!texto) {
      return [];
    }

    const segmentos: SegmentoTextoChat[] = [];
    const regex = /\*\*([^*]+)\*\*/g;
    let ultimoIndice = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(texto)) !== null) {
      if (match.index > ultimoIndice) {
        segmentos.push({
          texto: texto.slice(ultimoIndice, match.index),
          negrita: false
        });
      }

      segmentos.push({
        texto: match[1],
        negrita: true
      });

      ultimoIndice = regex.lastIndex;
    }

    if (ultimoIndice < texto.length) {
      segmentos.push({
        texto: texto.slice(ultimoIndice),
        negrita: false
      });
    }

    return segmentos;
  }

  seleccionarModo(nuevoModo: 'familia' | 'cuento' | 'biblioteca'): void {
    this.modo = nuevoModo;
    this.errorMsg = '';
    this.mensajeEstadoPdf = '';
    this.consulta = '';
    if (nuevoModo === 'biblioteca') {
      this.cargarCuentosGuardadosGithub();
    }
  }

  usarSugerencia(claveTraduccion: string): void {
    this.consulta = this.translate.instant(claveTraduccion);
    this.ejecutarConsulta();
  }

  limpiarConversacion(): void {
    this.mensajesChat = [];
    this.errorMsg = '';
  }

  limpiarCuento(): void {
    this.subIlustraciones?.unsubscribe();
    this.subIlustraciones = undefined;
    this.tituloCuento = '';
    this.parrafosCuento = [];
    this.estiloCuentoNombre = '';
    this.estiloCuentoPrompt = '';
    this.imagenesCuento = [null, null, null];
    this.cargandoImagenes = [false, false, false];
    this.imagenCuentoUrl = null;
    this.cargandoImagenCuento = false;
    this.cargandoPuter = false;
    this.mensajeEstadoPdf = '';
    this.errorMsg = '';
  }

  ejecutarConsulta(): void {
    const texto = (this.consulta ?? '').trim();
    if (!texto || this.cargando) {
      return;
    }

    if (!this.iaService.tieneApiKey()) {
      this.mostrarPanelToken = true;
      this.errorMsg = 'Primero introduce tu token / clave de IA en la barra superior.';
      return;
    }

    this.errorMsg = '';
    this.mensajeEstadoPdf = '';
    this.cargando = true;

    if (this.modo === 'familia') {
      this.mensajesChat.push({
        remitente: 'usuario',
        texto,
        hora: this.obtenerHoraActual()
      });
      this.consulta = '';

      this.iaService
        .preguntarFamilia(texto, this.obtenerIdiomaActivo())
        .pipe(finalize(() => (this.cargando = false)))
        .subscribe({
          next: (respuesta) => {
            this.mensajesChat.push({
              remitente: 'ia',
              texto: respuesta,
              hora: this.obtenerHoraActual(),
              proveedor: this.iaService.ultimoProveedorUsado
            });
          },
          error: (err) => {
            this.errorMsg = this.obtenerMensajeErrorAmigable(err);
          }
        });
    } else {
      this.subIlustraciones?.unsubscribe();
      const estiloElegido = this.iaService.obtenerEstiloAleatorioCuento();
      this.estiloCuentoNombre = estiloElegido.nombre;
      this.estiloCuentoPrompt = estiloElegido.prompt;

      this.imagenesCuento = [null, null, null];
      this.proveedoresImagenesCuento = [null, null, null];
      this.esImagenRealIa = [false, false, false];
      this.cargandoImagenes = [true, false, false];
      this.cargandoImagenCuento = true;
      this.imagenCuentoUrl = null;

      // 1. Collage rápido de respaldo mientras se generan las ilustraciones con IA
      this.iaService
        .crearCollageDesdePrompt(texto)
        .pipe(catchError(() => of(null)))
        .subscribe((collageUrl) => {
          if (collageUrl) {
            this.imagenesCuento = this.imagenesCuento.map((actual, idx) =>
              this.esImagenRealIa[idx] ? actual : (actual ?? collageUrl)
            );
            this.proveedoresImagenesCuento = this.proveedoresImagenesCuento.map((prov, idx) =>
              this.esImagenRealIa[idx] ? prov : (prov ?? 'Collage familiar (respaldo)')
            );
            this.imagenCuentoUrl = this.imagenesCuento[0];
          }
        });

      // 2. Generación del texto del cuento con las fuentes configuradas
      this.iaService
        .inventarCuento(
          {
            protagonistas: texto,
            lugar: texto,
            tono: 'tierno, mágico y divertido',
            estiloVisual: this.estiloCuentoNombre
          },
          this.obtenerIdiomaActivo(),
          this.fuentesCuento
        )
        .pipe(finalize(() => (this.cargando = false)))
        .subscribe({
          next: (cuentoRaw) => {
            this.formatearCuento(cuentoRaw, texto);
          },
          error: (err) => {
            this.errorMsg = this.obtenerMensajeErrorAmigable(err);
            const cuentoRespaldo = this.crearCuentoRespaldoLocal(texto);
            this.formatearCuento(cuentoRespaldo, texto);
          }
        });

      // 3. Generación progresiva de 3 ilustraciones con estilo aleatorio del cuento
      this.subIlustraciones = this.iaService
        .generarIlustracionesProgresivas(
          texto,
          () => this.obtenerTramosEscenaActuales(texto),
          3,
          2500,
          this.estiloCuentoPrompt
        )
        .pipe(
          finalize(() => {
            this.cargandoImagenes = [false, false, false];
            this.cargandoImagenCuento = false;
          })
        )
        .subscribe({
          next: ({ url, proveedor }) => {
            const huecoLibre = this.esImagenRealIa.findIndex((ocupado) => !ocupado);
            if (huecoLibre === -1) {
              return;
            }

            this.imagenesCuento[huecoLibre] = url;
            this.proveedoresImagenesCuento[huecoLibre] = proveedor;
            this.esImagenRealIa[huecoLibre] = true;
            this.cargandoImagenes[huecoLibre] = false;

            const siguienteHueco = this.esImagenRealIa.findIndex((ocupado) => !ocupado);
            this.cargandoImagenes = [false, false, false];
            if (siguienteHueco !== -1) {
              this.cargandoImagenes[siguienteHueco] = true;
            }

            if (huecoLibre === 0) {
              this.imagenCuentoUrl = url;
            }
          }
        });
    }
  }

  private obtenerTramosEscenaActuales(promptBase: string): [string, string, string] {
    const p = this.parrafosCuento;
    if (!p || p.length === 0) {
      return [
        `Comienzo de la aventura: ${promptBase}`,
        `Nudo y descubrimiento en la aventura: ${promptBase}`,
        `Celebración y final feliz: ${promptBase}`
      ];
    }

    const inicio = p[0];
    const idxMitad = Math.max(0, Math.min(p.length - 1, Math.floor(p.length / 2)));
    const mitad = p[idxMitad];
    const final = p[p.length - 1];

    return [inicio, mitad, final];
  }

  /** Ilustración con IA desde botón. */
  ilustrarConPuter(): void {
    if (this.cargandoPuter || this.parrafosCuento.length === 0) {
      return;
    }

    this.cargandoPuter = true;
    this.cargandoImagenes[0] = true;
    this.errorMsg = '';

    this.iaService
      .generarIlustracionPuter(this.tituloCuento, this.parrafosCuento[0], this.estiloCuentoPrompt)
      .pipe(
        finalize(() => {
          this.cargandoPuter = false;
          this.cargandoImagenes[0] = false;
        })
      )
      .subscribe({
        next: (url) => {
          this.imagenesCuento[0] = url;
          this.imagenCuentoUrl = url;
        },
        error: (e) => {
          this.errorMsg = this.translate.instant('iaRincon.errorIlustracion', e);
        }
      });
  }

  // ═════════════════════════════════════════════════════════
  //  PDF CON JSPDF + GUARDAR EN GITHUB + CONSULTA
  // ═════════════════════════════════════════════════════════

  private guardarArchivoEnRutaGithub(
    rutaRepo: string,
    nombreArchivo: string,
    base64Pdf: string,
    headers: HttpHeaders
  ): Observable<{ rutaRepo: string; downloadUrl?: string; error?: string }> {
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${rutaRepo}`;

    return this.http
      .get<any>(`${apiUrl}?ref=${this.repoBranch}`, { headers })
      .pipe(
        catchError(() => of(null)),
        map((existente) => existente?.sha as string | undefined),
        switchMap((sha) => {
          const body: Record<string, unknown> = {
            message: `Añadir cuento PDF: ${nombreArchivo}`,
            content: base64Pdf,
            branch: this.repoBranch
          };
          if (sha) {
            body['sha'] = sha;
          }

          return this.http.put<any>(apiUrl, body, { headers }).pipe(
            map((res) => ({
              rutaRepo,
              downloadUrl: res?.content?.download_url as string | undefined
            })),
            catchError((err) =>
              of({
                rutaRepo,
                error: err?.error?.message || err?.message || 'error'
              })
            )
          );
        })
      );
  }

  async guardarCuentoEnGithubPdf(): Promise<void> {
    if (!this.parrafosCuento.length || this.guardandoGithub || this.generandoPdf) return;

    const token = this.obtenerTokenGithub();
    if (!token) {
      this.errorMsg = 'Configura tu token de GitHub (gh_travel_token) en la barra superior para guardar en GitHub.';
      return;
    }

    this.guardandoGithub = true;
    this.generandoPdf = true;
    this.errorMsg = '';
    this.mensajeEstadoPdf = '';

    try {
      const tituloFormateado = this.capitalizarInicial(this.tituloCuento || 'Cuento familiar');
      const fechaStr = new Date().toISOString().slice(0, 10);
      const nombreArchivo = this.obtenerNombreArchivoPdfCuento(tituloFormateado);
      const rutaSrc = `${this.carpetaCuentosPdfRepo}/${nombreArchivo}`;
      const rutaDocs = `${this.carpetaCuentosPdfDocsRepo}/${nombreArchivo}`;

      const miniaturaImg = this.imagenesCuento[0]
        ? await this.comprimirImagenParaPdf(this.imagenesCuento[0], 180, 0.6)
        : null;

      const pdfBytes = await this.construirPdfLigeroConImagenes(
        this.tituloCuento || 'Cuento familiar',
        this.parrafosCuento,
        this.imagenesCuento
      );
      const base64Pdf = this.bytesToBase64(pdfBytes);
      const kb = Math.max(1, Math.round(pdfBytes.byteLength / 1024));

      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      forkJoin([
        this.guardarArchivoEnRutaGithub(rutaSrc, nombreArchivo, base64Pdf, headers),
        this.guardarArchivoEnRutaGithub(rutaDocs, nombreArchivo, base64Pdf, headers)
      ])
        .pipe(
          finalize(() => {
            this.guardandoGithub = false;
            this.generandoPdf = false;
          })
        )
        .subscribe(([resSrc, resDocs]) => {
          const guardadosOk = [resSrc, resDocs].filter((r) => !r.error);
          const fallidos = [resSrc, resDocs].filter((r) => Boolean(r.error));

          if (guardadosOk.length === 0) {
            this.errorMsg = `No se pudo guardar en GitHub: ${fallidos[0]?.error || 'error'}`;
            return;
          }

          const downloadUrl = resDocs.downloadUrl || resSrc.downloadUrl;
          this.mensajeEstadoPdf =
            fallidos.length === 0
              ? `Guardado en GitHub (${kb} KB) en ${rutaSrc} y ${rutaDocs}.`
              : `Guardado en ${guardadosOk.map((g) => g.rutaRepo).join(' y ')}, pero falló en ${fallidos
                  .map((f) => `${f.rutaRepo} (${f.error})`)
                  .join(', ')}.`;

          this.cuentosGuardados = [
            {
              nombreArchivo,
              titulo: this.tituloCuento,
              fecha: fechaStr,
              downloadUrl,
              pdfBase64: base64Pdf,
              miniaturaUrl: miniaturaImg?.dataUrl
            },
            ...this.cuentosGuardados.filter((c) => c.nombreArchivo !== nombreArchivo)
          ];
        });
    } catch {
      this.guardandoGithub = false;
      this.generandoPdf = false;
      this.errorMsg = 'No se pudo preparar el PDF.';
    }
  }

  private obtenerNombreArchivoPdfCuento(titulo: string): string {
    const tituloLimpio = (titulo || 'cuento').trim();
    const baseTitulo = this.slugArchivoCuento(tituloLimpio);
    return `${baseTitulo}.pdf`;
  }

  private slugArchivoCuento(titulo: string): string {
    const sinPrefijo = (titulo || 'cuento')
      .replace(/^(un cuento sobre:|cuento de|la aventura de|una gran aventura inspirada en:)\s*/i, '');

    const palabras = sinPrefijo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (palabras.length === 0) {
      return 'cuento';
    }

    const maxLongitud = 100;
    let slug = '';
    for (const p of palabras) {
      const candidato = slug ? `${slug}-${p}` : p;
      if (candidato.length > maxLongitud && slug) {
        break;
      }
      slug = candidato;
    }

    return slug || 'cuento';
  }

  async descargarCuentoPdfLocal(): Promise<void> {
    if (!this.parrafosCuento.length || this.generandoPdf) return;
    this.generandoPdf = true;
    this.errorMsg = '';
    try {
      const titulo = (this.tituloCuento || 'Cuento familiar').trim();
      const nombreArchivo = this.obtenerNombreArchivoPdfCuento(titulo);
      const pdfBytes = await this.construirPdfLigeroConImagenes(
        titulo,
        this.parrafosCuento,
        this.imagenesCuento
      );
      this.dispararDescargaPdfBlob(pdfBytes, nombreArchivo);

      const kb = Math.max(1, Math.round(pdfBytes.byteLength / 1024));
      this.mensajeEstadoPdf = `PDF descargado (${kb} KB): ${nombreArchivo}`;
    } catch {
      this.errorMsg = 'No se pudo generar el PDF.';
    } finally {
      this.generandoPdf = false;
    }
  }

  cargarCuentosGuardadosGithub(): void {
    this.cargandoBiblioteca = true;
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.carpetaCuentosPdfRepo}?ref=${this.repoBranch}`;
    const token = this.obtenerTokenGithub();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    this.http
      .get<any[]>(apiUrl, headers ? { headers } : {})
      .pipe(
        catchError(() => of([])),
        finalize(() => (this.cargandoBiblioteca = false))
      )
      .subscribe((items) => {
        const lista: CuentoGuardadoItem[] = (Array.isArray(items) ? items : [])
          .filter((it) => it.type === 'file' && String(it.name).toLowerCase().endsWith('.pdf'))
          .sort((a, b) => String(a.name).localeCompare(String(b.name)))
          .map((it) => {
            const tituloSinExtension = String(it.name)
              .replace(/\.pdf$/i, '')
              .replace(/^\d{4}-\d{2}-\d{2}-/, '')
              .replace(/-/g, ' ');
            return {
              nombreArchivo: it.name,
              titulo: this.capitalizarInicial(tituloSinExtension),
              fecha: String(it.name).slice(0, 10),
              downloadUrl: it.download_url
            };
          });

        const existentesNombres = new Set(lista.map((x) => x.nombreArchivo));
        const localesSesion = this.cuentosGuardados.filter((x) => !existentesNombres.has(x.nombreArchivo));
        const combinada = [...localesSesion, ...lista];

        const prevPorNombre = new Map(this.cuentosGuardados.map((c) => [c.nombreArchivo, c]));
        this.cuentosGuardados = combinada.map((item) => {
          const prev = prevPorNombre.get(item.nombreArchivo);
          return {
            ...item,
            pdfBase64: item.pdfBase64 || prev?.pdfBase64,
            miniaturaUrl: item.miniaturaUrl || prev?.miniaturaUrl
          };
        });

        this.enriquecerMiniaturasDesdePdf(this.cuentosGuardados);
      });
  }

  private enriquecerMiniaturasDesdePdf(items: CuentoGuardadoItem[]): void {
    const pendientes = items.filter((it) => !it.miniaturaUrl);
    if (pendientes.length === 0) return;

    const token = this.obtenerTokenGithub();

    for (const item of pendientes) {
      if (item.pdfBase64) {
        const bytes = this.base64ToBytes(item.pdfBase64);
        this.extraerMiniaturaJpegDesdePdfBytes(bytes).then((mini) => {
          if (mini) item.miniaturaUrl = mini;
        });
        continue;
      }

      const urlCandidata = item.downloadUrl || `assets/cuentos-pdf/${item.nombreArchivo}`;
      const headers =
        token && urlCandidata.includes('api.github.com')
          ? new HttpHeaders({ Authorization: `Bearer ${token}` })
          : undefined;

      this.http
        .get(urlCandidata, {
          ...(headers ? { headers } : {}),
          responseType: 'blob'
        })
        .pipe(
          catchError(() =>
            item.downloadUrl
              ? this.http.get(`assets/cuentos-pdf/${item.nombreArchivo}`, { responseType: 'blob' }).pipe(catchError(() => of(null)))
              : of(null)
          )
        )
        .subscribe(async (blob) => {
          if (!blob || blob.size === 0) return;
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const mini = await this.extraerMiniaturaJpegDesdePdfBytes(bytes);
          if (mini) {
            item.miniaturaUrl = mini;
          }
        });
    }
  }

  private async extraerMiniaturaJpegDesdePdfBytes(pdfBytes: Uint8Array): Promise<string | undefined> {
    let inicio = -1;
    for (let i = 0; i < pdfBytes.length - 3; i++) {
      if (pdfBytes[i] === 0xff && pdfBytes[i + 1] === 0xd8 && pdfBytes[i + 2] === 0xff) {
        inicio = i;
        break;
      }
    }
    if (inicio === -1) return undefined;

    let fin = -1;
    for (let j = inicio + 3; j < pdfBytes.length - 1; j++) {
      if (pdfBytes[j] === 0xff && pdfBytes[j + 1] === 0xd9) {
        fin = j + 2;
        break;
      }
    }
    if (fin === -1 || fin <= inicio) return undefined;

    const jpegBytes = pdfBytes.slice(inicio, fin);
    const jpegBlob = new Blob([jpegBytes], { type: 'image/jpeg' });
    const rawDataUrl = await this.blobADataUrl(jpegBlob);
    if (!rawDataUrl) return undefined;

    const mini = await this.comprimirImagenParaPdf(rawDataUrl, 160, 0.58);
    return mini?.dataUrl || rawDataUrl;
  }

  private blobADataUrl(blob: Blob): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  abrirCuentoPdf(item: CuentoGuardadoItem): void {
    this.errorMsg = '';

    if (item.pdfBase64) {
      const bytes = this.base64ToBytes(item.pdfBase64);
      const pdfBlob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      this.entregarPdfAlDispositivo(pdfBlob, item.nombreArchivo);
      return;
    }

    const urlsCandidatas: string[] = [];
    if (item.downloadUrl) {
      urlsCandidatas.push(item.downloadUrl);
    }
    urlsCandidatas.push(`assets/cuentos-pdf/${item.nombreArchivo}`);

    this.cargandoBiblioteca = true;
    this.descargarPdfDesdeUrls(urlsCandidatas, 0)
      .pipe(finalize(() => (this.cargandoBiblioteca = false)))
      .subscribe({
        next: async (blob) => {
          if (!blob || blob.size === 0) {
            this.errorMsg = 'El archivo PDF descargado está vacío.';
            return;
          }

          const esPdfValido = await this.esCabeceraPdfValida(blob);
          if (!esPdfValido) {
            this.errorMsg = 'El archivo recibido no tiene formato PDF válido.';
            return;
          }

          const pdfBlob = new Blob([blob], { type: 'application/pdf' });
          this.entregarPdfAlDispositivo(pdfBlob, item.nombreArchivo);
        },
        error: () => {
          this.errorMsg = 'No se pudo descargar el PDF desde GitHub.';
        }
      });
  }

  obtenerUrlPublicaPdf(item: CuentoGuardadoItem): string {
    if (item.downloadUrl) {
      return item.downloadUrl;
    }
    return `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/${this.repoBranch}/${this.carpetaCuentosPdfRepo}/${encodeURIComponent(item.nombreArchivo)}`;
  }

  obtenerUrlVisorMovil(item: CuentoGuardadoItem): string {
    const urlPdf = this.obtenerUrlPublicaPdf(item);
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(urlPdf)}`;
  }

  private descargarPdfDesdeUrls(urls: string[], indice: number): Observable<Blob | null> {
    if (indice >= urls.length) {
      return of(null);
    }

    const url = urls[indice];
    const token = this.obtenerTokenGithub();
    const esApiGithub = url.includes('api.github.com');
    const headers =
      token && esApiGithub
        ? new HttpHeaders({ Authorization: `Bearer ${token}` })
        : undefined;

    return this.http
      .get(url, {
        ...(headers ? { headers } : {}),
        responseType: 'blob'
      })
      .pipe(
        catchError(() => this.descargarPdfDesdeUrls(urls, indice + 1))
      );
  }

  private async esCabeceraPdfValida(blob: Blob): Promise<boolean> {
    try {
      const cabecera = await blob.slice(0, 5).text();
      return cabecera === '%PDF-';
    } catch {
      return false;
    }
  }

  private dispararDescargaPdfBlob(bytes: Uint8Array, nombreArchivo: string): void {
    const pdfBlob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    this.entregarPdfAlDispositivo(pdfBlob, nombreArchivo);
  }

  private entregarPdfAlDispositivo(blob: Blob, nombreArchivo: string): void {
    const nombreLimpio = nombreArchivo.toLowerCase().endsWith('.pdf')
      ? nombreArchivo
      : `${nombreArchivo}.pdf`;

    const url = URL.createObjectURL(blob);
    const esMovil =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

    if (esMovil) {
      const ventana = window.open(url, '_blank');
      if (!ventana) {
        this.forzarDescargaConEnlace(url, nombreLimpio);
      }
      setTimeout(() => URL.revokeObjectURL(url), 180000);
      return;
    }

    this.forzarDescargaConEnlace(url, nombreLimpio);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  private forzarDescargaConEnlace(url: string, nombreArchivo: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private base64ToBytes(base64: string): Uint8Array {
    const limpio = base64.includes(',') ? base64.split(',')[1] : base64;
    const bin = atob(limpio);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  private limpiarTextoParaPdf(texto: string): string {
    return (texto || '')
      .replace(/\*+([^*]+)\*+/g, '$1')
      .replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async construirPdfLigeroConImagenes(
    titulo: string,
    parrafos: string[],
    imagenesSrc: Array<string | null>
  ): Promise<Uint8Array> {
    const imagenesComprimidas: Array<ImagenComprimida | null> = await Promise.all(
      imagenesSrc.map((src) => (src ? this.comprimirImagenParaPdf(src, 640, 0.58) : Promise.resolve(null)))
    );

    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4'
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 45;
    const marginTop = 55;
    const marginBottom = 50;
    const maxTextW = pageW - marginX * 2;

    let y = marginTop;

    const asegurarEspacio = (altoNecesario: number) => {
      if (y + altoNecesario > pageH - marginBottom) {
        doc.addPage();
        y = marginTop;
      }
    };

    const dibujarLineas = (texto: string, size: number, salto: number, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const limpio = this.limpiarTextoParaPdf(texto);
      if (!limpio) return;

      const lineas: string[] = doc.splitTextToSize(limpio, maxTextW);
      for (const linea of lineas) {
        asegurarEspacio(salto);
        doc.text(linea, marginX, y + size * 0.8);
        y += salto;
      }
    };

    const dibujarImagenSlot = (slotIdx: number) => {
      const im = imagenesComprimidas[slotIdx];
      if (!im || !im.width || !im.height) return;

      const ratio = im.height / im.width;
      const drawW = Math.min(maxTextW, 380);
      const drawH = Math.min(210, Math.round(drawW * ratio));
      const drawX = Math.round((pageW - drawW) / 2);

      asegurarEspacio(drawH + 14);
      doc.addImage(im.dataUrl, 'JPEG', drawX, y, drawW, drawH, undefined, 'FAST');
      y += drawH + 14;
    };

    dibujarLineas(titulo, 17, 22, true);
    y += 6;

    dibujarImagenSlot(0);

    const mitadIdx = Math.max(0, Math.floor(parrafos.length / 2) - 1);
    parrafos.forEach((p, i) => {
      dibujarLineas(p, 11, 15, false);
      y += 6;
      if (i === mitadIdx) {
        dibujarImagenSlot(1);
      }
    });

    dibujarImagenSlot(2);

    const buffer = doc.output('arraybuffer');
    return new Uint8Array(buffer);
  }

  private async comprimirImagenParaPdf(
    src: string,
    maxAncho: number,
    calidad: number
  ): Promise<ImagenComprimida | null> {
    if (typeof document === 'undefined') return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const natW = img.naturalWidth || img.width || 600;
          const natH = img.naturalHeight || img.height || 400;
          const escala = Math.min(1, maxAncho / natW);
          const width = Math.max(120, Math.round(natW * escala));
          const height = Math.max(90, Math.round(natH * escala));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.fillStyle = '#fffdf9';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', calidad);
          resolve({ dataUrl, width, height });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  private obtenerTokenGithub(): string {
    return (
      localStorage.getItem('gh_travel_token') ||
      localStorage.getItem('github_token') ||
      localStorage.getItem('token') ||
      ''
    ).trim();
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binario = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binario += String.fromCharCode(...sub);
    }
    return btoa(binario);
  }

  obtenerSegmentosCuento(parrafo: string): SegmentoTextoChat[] {
    if (!parrafo) {
      return [];
    }

    const normalizado = parrafo.replace(/\*\*([^*]+)\*\*/g, '*$1*');
    const segmentos: SegmentoTextoChat[] = [];
    const regex = /\*([^*]+)\*/g;
    let ultimoIndice = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalizado)) !== null) {
      if (match.index > ultimoIndice) {
        segmentos.push({
          texto: normalizado.slice(ultimoIndice, match.index),
          negrita: false
        });
      }

      segmentos.push({
        texto: match[1],
        negrita: true
      });

      ultimoIndice = regex.lastIndex;
    }

    if (ultimoIndice < normalizado.length) {
      segmentos.push({
        texto: normalizado.slice(ultimoIndice),
        negrita: false
      });
    }

    return segmentos;
  }

  private capitalizarInicial(texto: string): string {
    const limpio = (texto ?? '').trim();
    if (!limpio) {
      return '';
    }
    return limpio.charAt(0).toLocaleUpperCase() + limpio.slice(1);
  }

  private formatearCuento(raw: string, promptOriginal: string): void {
    const bloques = raw
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);

    if (bloques.length > 1 && bloques[0].length < 95 && !bloques[0].endsWith('.')) {
      this.tituloCuento = this.capitalizarInicial(bloques[0].replace(/^#+\s*|\*\*/g, '').trim());
      this.parrafosCuento = bloques.slice(1).map((p) => p.trim());
    } else {
      this.tituloCuento = this.capitalizarInicial(`Un cuento sobre: ${promptOriginal}`);
      this.parrafosCuento =
        bloques.length > 0
          ? bloques.map((p) => p.trim())
          : [raw.trim()];
    }
  }

  private obtenerHoraActual(): string {
    const ahora = new Date();
    return ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private obtenerIdiomaActivo(): IdiomaIa {
    const actual = (this.translate.currentLang || this.translate.defaultLang || 'es').toLowerCase();
    return actual.startsWith('val') ? 'val' : 'es';
  }

  onTokenIaGuardado(token: string): void {
    this.commonService.claveGuardada = Boolean((token ?? '').trim());
    if (this.commonService.claveGuardada) {
      this.errorMsg = '';
    }
  }

  private obtenerMensajeErrorAmigable(err: any): string {
    const rawMensaje =
      err?.error?.message ||
      err?.error?.error?.message ||
      err?.message ||
      (typeof err === 'string' ? err : '');

    const textoMinusculas = String(rawMensaje).toLowerCase();
    const codigo = err?.status ?? err?.error?.code ?? err?.error?.error?.code;
    const estado = err?.statusText || err?.error?.status;

    const esSobrecarga503 =
      codigo === 503 ||
      estado === 'UNAVAILABLE' ||
      textoMinusculas.includes('503') ||
      textoMinusculas.includes('unavailable') ||
      textoMinusculas.includes('high demand');

    if (esSobrecarga503) {
      return this.translate.instant('iaRincon.errorAltaDemanda');
    }

    if (codigo === 429 || textoMinusculas.includes('429') || textoMinusculas.includes('quota')) {
      return this.translate.instant('iaRincon.errorCuota');
    }

    if (
      codigo === 401 ||
      codigo === 403 ||
      textoMinusculas.includes('clave') ||
      textoMinusculas.includes('api key')
    ) {
      return this.translate.instant('iaRincon.errorFaltaToken');
    }

    return this.translate.instant('iaRincon.errorGenerico');
  }

  private crearCuentoRespaldoLocal(promptTexto: string): string {
    if (this.obtenerIdiomaActivo() === 'val') {
      return [
        `Una gran aventura inspirada en: ${promptTexto}`,
        `Hi havia una vegada una expedició plena d'il·lusió inspirada en ${promptTexto}. Amb una brúixola daurada i un mapa dibuixat a mà, els protagonistes van salpar cap a cales d'aigua cristal·lina.`,
        `Entre onades suaus, gavines juganeres i pistes amagades entre les roques, van descobrir que el millor tresor de tots era compartir aquella aventura junts.`,
        `Quan el sol es va pondre tenyint el cel de taronja, van tornar a port amb un munt de rialles i records per a tota la vida.`
      ].join('\n\n');
    }

    return [
      `Una gran aventura inspirada en: ${promptTexto}`,
      `Había una vez una expedición llena de ilusión inspirada en ${promptTexto}. Con una brújula dorada y un mapa dibujado a mano, los protagonistas zarparon hacia calas de agua cristalina.`,
      `Entre olas tranquilas, gaviotas juguetonas y pistas escondidas junto a la orilla, descubrieron que el mejor tesoro de todos era compartir aquella aventura juntos.`,
      `Cuando el sol empezó a esconderse tiñendo el cielo de naranja, regresaron a puerto con un montón de risas y recuerdos inolvidables.`
    ].join('\n\n');
  }
}
