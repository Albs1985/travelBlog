import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { IdiomaIa, IaFamiliaService } from '../../services/ia-familia.service';
import { finalize, of, catchError, map, Subscription } from 'rxjs';

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
}

interface ImagenPdfLista {
  dataUrl: string;
  width: number;
  height: number;
  bytes: Uint8Array;
}

@Component({
  selector: 'app-ia-rincon',
  templateUrl: './ia-rincon.component.html',
  styleUrls: ['./ia-rincon.component.css']
})
export class IaRinconComponent implements OnInit {
  modo: 'familia' | 'cuento' | 'biblioteca' = 'cuento';

  apiKeyInput = '';
  claveGuardada = false;
  mostrarPanelToken = false;

  consulta = '';
  mensajesChat: MensajeChatFamilia[] = [];

  // Modo Cuentos: 3 ilustraciones (inicio, medio, final) + skeletons
  tituloCuento = '';
  parrafosCuento: string[] = [];
  mostrarHuecoImagen = true;

  imagenesCuento: Array<string | null> = [null, null, null];
  cargandoImagenes: boolean[] = [false, false, false];
  imagenCuentoUrl: string | null = null;
  cargandoImagenCuento = false;
  cargandoPuter = false;

  // Guardado PDF ligero y GitHub + Biblioteca de PDFs
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

  constructor(
    private iaService: IaFamiliaService,
    private translate: TranslateService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.apiKeyInput = this.iaService.obtenerApiKey();
    this.claveGuardada = this.iaService.tieneApiKey();
    this.iaService.limpiarCacheContexto();
  }

  ngOnDestroy(): void {
    this.subIlustraciones?.unsubscribe();
  }

  get indiceMitadCuento(): number {
    return Math.max(1, Math.floor(this.parrafosCuento.length / 2));
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
      this.imagenesCuento = [null, null, null];
      this.proveedoresImagenesCuento = [null, null, null];
      this.cargandoImagenes = [true, false, false];
      this.cargandoImagenCuento = true;
      this.imagenCuentoUrl = null;

      // 1. Collage rápido de respaldo mientras se generan las ilustraciones con IA
      this.iaService
        .crearCollageDesdePrompt(texto)
        .pipe(catchError(() => of(null)))
        .subscribe((collageUrl) => {
          if (collageUrl) {
            this.imagenesCuento = this.imagenesCuento.map((actual) => actual ?? collageUrl);
            this.proveedoresImagenesCuento = this.proveedoresImagenesCuento.map(
              (prov) => prov ?? 'Collage familiar (respaldo)'
            );
            this.imagenCuentoUrl = this.imagenesCuento[0];
          }
        });

      // 2. Generación del texto del cuento (apaga "cargando" al terminar)
      this.iaService
        .inventarCuento(
          {
            protagonistas: texto,
            lugar: texto,
            tono: 'tierno, mágico y divertido'
          },
          this.obtenerIdiomaActivo()
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

      // 3. Secuencia escalonada de 3 ilustraciones cada 16s: 0s (inicio), 16s (mitad), 32s (final)
      this.subIlustraciones = this.iaService
        .generarTresIlustracionesEscalonadas(texto, [texto, texto, texto], 16000)
        .pipe(
          finalize(() => {
            this.cargandoImagenes = [false, false, false];
            this.cargandoImagenCuento = false;
          })
        )
        .subscribe({
          next: ({ indice, url, proveedor }) => {
            this.cargandoImagenes[indice] = false;
            if (indice + 1 < 3) {
              this.cargandoImagenes[indice + 1] = true;
            }
            if (url) {
              this.imagenesCuento[indice] = url;
              this.proveedoresImagenesCuento[indice] = proveedor || 'IA';
              if (indice === 0) {
                this.imagenCuentoUrl = url;
              }
            }
          }
        });
      }
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
      .generarIlustracionPuter(this.tituloCuento, this.parrafosCuento[0])
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
  //  PDF LIGERO CON IMÁGENES + GUARDAR EN GITHUB + CONSULTA
  // ═════════════════════════════════════════════════════════

  private obtenerNombreArchivoPdfCuento(titulo: string, fechaStr = new Date().toISOString().slice(0, 10)): string {
    const tituloLimpio = (titulo || 'cuento-familiar').trim();
    const baseTitulo = this.slugArchivoCuento(tituloLimpio);
    return `${baseTitulo}-${fechaStr}.pdf`;
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
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      const kb = Math.max(1, Math.round(pdfBytes.byteLength / 1024));
      this.mensajeEstadoPdf = `PDF ligero descargado (${kb} KB): ${nombreArchivo}`;
    } catch {
      this.errorMsg = 'No se pudo generar el PDF ligero.';
    } finally {
      this.generandoPdf = false;
    }
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
      const nombreBase = (this.tituloCuento || 'Cuento familiar').trim();
      const fechaStr = new Date().toISOString().slice(0, 10);
      const nombreArchivo = this.obtenerNombreArchivoPdfCuento(nombreBase, fechaStr);
      const rutaRepo = `${this.carpetaCuentosPdfRepo}/${nombreArchivo}`;

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

      const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${rutaRepo}`;

      this.http
        .get<any>(`${apiUrl}?ref=${this.repoBranch}`, { headers })
        .pipe(
          catchError(() => of(null)),
          map((existente) => existente?.sha as string | undefined)
        )
        .subscribe({
          next: (sha) => {
            const body: Record<string, unknown> = {
              message: `Añadir cuento PDF ligero: ${nombreArchivo}`,
              content: base64Pdf,
              branch: this.repoBranch
            };
            if (sha) {
              body['sha'] = sha;
            }

            this.http
              .put<any>(apiUrl, body, { headers })
              .pipe(
                finalize(() => {
                  this.guardandoGithub = false;
                  this.generandoPdf = false;
                })
              )
              .subscribe({
                next: (res) => {
                  const downloadUrl = res?.content?.download_url;
                  this.mensajeEstadoPdf = `Guardado en GitHub (${kb} KB) en ${rutaRepo}.`;
                  this.cuentosGuardados = [
                    {
                      nombreArchivo,
                      titulo: this.tituloCuento,
                      fecha: fechaStr,
                      downloadUrl,
                      pdfBase64: base64Pdf
                    },
                    ...this.cuentosGuardados.filter((c) => c.nombreArchivo !== nombreArchivo)
                  ];
                },
                error: (err) => {
                  this.errorMsg = `No se pudo guardar en GitHub: ${err?.error?.message || err?.message || 'error'}`;
                }
              });
          },
          error: () => {
            this.guardandoGithub = false;
            this.generandoPdf = false;
            this.errorMsg = 'Error al comprobar el archivo en GitHub.';
          }
        });
    } catch {
      this.guardandoGithub = false;
      this.generandoPdf = false;
      this.errorMsg = 'No se pudo preparar el PDF ligero.';
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
        const lista = (Array.isArray(items) ? items : [])
          .filter((it) => it.type === 'file' && String(it.name).toLowerCase().endsWith('.pdf'))
          .sort((a, b) => String(b.name).localeCompare(String(a.name)))
          .map((it) => ({
            nombreArchivo: it.name,
            titulo: String(it.name)
              .replace(/\.pdf$/i, '')
              .replace(/^\d{4}-\d{2}-\d{2}-/, '')
              .replace(/-/g, ' '),
            fecha: String(it.name).slice(0, 10),
            downloadUrl: it.download_url
          }));

        const existentesNombres = new Set(lista.map((x) => x.nombreArchivo));
        const localesSesion = this.cuentosGuardados.filter((x) => !existentesNombres.has(x.nombreArchivo));
        this.cuentosGuardados = [...localesSesion, ...lista];
      });
  }

  abrirCuentoPdf(item: CuentoGuardadoItem): void {
    if (item.pdfBase64) {
      const byteCharacters = atob(item.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      return;
    }

    const assetUrl = `assets/cuentos-pdf/${item.nombreArchivo}`;
    window.open(item.downloadUrl || assetUrl, '_blank');
  }

  /**
   * Comprime cada imagen disponible a JPEG ligero (ancho max 640px, calidad 0.58)
   * e incrusta texto e imágenes en un PDF compacto de una o varias páginas.
   */
  private async construirPdfLigeroConImagenes(
    titulo: string,
    parrafos: string[],
    imagenesSrc: Array<string | null>
  ): Promise<Uint8Array> {
    const imagenesComprimidas: Array<ImagenPdfLista | null> = await Promise.all(
      imagenesSrc.map((src) => (src ? this.comprimirImagenParaPdf(src, 640, 0.58) : Promise.resolve(null)))
    );

    const escaparPdf = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

    const envolverLineas = (texto: string, maxChars: number): string[] => {
      const palabras = texto.split(/\s+/).filter(Boolean);
      const lineas: string[] = [];
      let actual = '';
      for (const p of palabras) {
        if ((actual + ' ' + p).trim().length > maxChars) {
          if (actual) lineas.push(actual);
          actual = p;
        } else {
          actual = actual ? `${actual} ${p}` : p;
        }
      }
      if (actual) lineas.push(actual);
      return lineas;
    };

    const pageW = 595;
    const pageH = 842;
    const marginX = 45;
    const maxTextW = pageW - marginX * 2;

    const paginasOps: string[][] = [];
    const xObjectRefs: string[] = [];
    const extraObjetos: Array<{ id: number; header: string; rawBytes: Uint8Array }> = [];

    let nextObjId = 6;
    const imgNamesBySlot: Array<string | null> = [null, null, null];

    imagenesComprimidas.forEach((im, idx) => {
      if (!im) return;
      const objId = nextObjId++;
      const resName = `Im${idx + 1}`;
      imgNamesBySlot[idx] = resName;
      xObjectRefs.push(`/${resName} ${objId} 0 R`);
      const header = `<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>`;
      extraObjetos.push({ id: objId, header, rawBytes: im.bytes });
    });

    let ops: string[] = [];
    let y = pageH - 55;

    const nuevaPagina = () => {
      if (ops.length > 0) {
        paginasOps.push(ops);
      }
      ops = [];
      y = pageH - 55;
    };

    const asegurarEspacio = (altoNecesario: number) => {
      if (y - altoNecesario < 50) {
        nuevaPagina();
      }
    };

    const dibujarTexto = (texto: string, size: number, salto: number) => {
      asegurarEspacio(salto + 4);
      ops.push('BT', `/F1 ${size} Tf`, `1 0 0 1 ${marginX} ${Math.round(y)} Tm`, `(${escaparPdf(texto)}) Tj`, 'ET');
      y -= salto;
    };

    const dibujarImagenSlot = (slotIdx: number) => {
      const resName = imgNamesBySlot[slotIdx];
      const im = imagenesComprimidas[slotIdx];
      if (!resName || !im) return;
      const ratio = im.height / im.width;
      const drawW = Math.min(maxTextW, 380);
      const drawH = Math.min(210, Math.round(drawW * ratio));
      const drawX = Math.round((pageW - drawW) / 2);

      asegurarEspacio(drawH + 16);
      const drawY = Math.round(y - drawH);
      ops.push('q', `${drawW} 0 0 ${drawH} ${drawX} ${drawY} cm`, `/${resName} Do`, 'Q');
      y = drawY - 14;
    };

    // Título
    for (const l of envolverLineas(titulo, 52)) {
      dibujarTexto(l, 17, 22);
    }
    y -= 6;

    // 1. Imagen al inicio
    dibujarImagenSlot(0);

    // Párrafos + 2. Imagen a la mitad
    const mitadIdx = Math.max(0, Math.floor(parrafos.length / 2) - 1);
    parrafos.forEach((p, i) => {
      for (const l of envolverLineas(p, 80)) {
        dibujarTexto(l, 11, 15);
      }
      y -= 6;
      if (i === mitadIdx) {
        dibujarImagenSlot(1);
      }
    });

    // 3. Imagen al final
    dibujarImagenSlot(2);

    if (ops.length > 0) {
      paginasOps.push(ops);
    }

    // Construimos objetos PDF en bytes para incluir el stream binario JPEG sin corromperlo
    const encoder = new TextEncoder();
    const parts: Array<string | Uint8Array> = ['%PDF-1.4\n'];
    const offsets: number[] = [0];
    let currentLen = encoder.encode('%PDF-1.4\n').length;

    const pushChunk = (chunk: string | Uint8Array) => {
      const b = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
      parts.push(b);
      currentLen += b.length;
    };

    const pageObjIds: number[] = [];
    const contentObjIds: number[] = [];
    for (let p = 0; p < paginasOps.length; p++) {
      contentObjIds.push(nextObjId++);
      pageObjIds.push(nextObjId++);
    }

    const totalObjects = nextObjId - 1;
    const objChunks = new Map<number, Array<string | Uint8Array>>();

    objChunks.set(1, [`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`]);
    objChunks.set(2, [
      `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`
    ]);

    const xObjDict = xObjectRefs.length ? `/XObject << ${xObjectRefs.join(' ')} >>` : '';
    for (let p = 0; p < paginasOps.length; p++) {
      const streamStr = paginasOps[p].join('\n');
      const streamBytes = encoder.encode(streamStr);
      const cId = contentObjIds[p];
      const pId = pageObjIds[p];

      objChunks.set(cId, [
        `${cId} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`,
        streamBytes,
        `\nendstream\nendobj\n`
      ]);

      objChunks.set(pId, [
        `${pId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${cId} 0 R /Resources << /Font << /F1 5 0 R >> ${xObjDict} >> >>\nendobj\n`
      ]);
    }

    objChunks.set(5, [`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`]);

    for (const ex of extraObjetos) {
      objChunks.set(ex.id, [
        `${ex.id} 0 obj\n${ex.header}\nstream\n`,
        ex.rawBytes,
        `\nendstream\nendobj\n`
      ]);
    }

    for (let id = 1; id <= totalObjects; id++) {
      offsets[id] = currentLen;
      const chunks = objChunks.get(id) || [];
      for (const ch of chunks) {
        pushChunk(ch);
      }
    }

    const xrefPos = currentLen;
    let xrefStr = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= totalObjects; id++) {
      xrefStr += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    xrefStr += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    pushChunk(xrefStr);

    const out = new Uint8Array(currentLen);
    let offset = 0;
    for (const ch of parts) {
      const b = ch as Uint8Array;
      out.set(b, offset);
      offset += b.length;
    }
    return out;
  }

  private async comprimirImagenParaPdf(
    src: string,
    maxAncho: number,
    calidad: number
  ): Promise<ImagenPdfLista | null> {
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
          const base64 = dataUrl.split(',')[1] || '';
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
          }
          resolve({ dataUrl, width, height, bytes });
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

  private slugArchivoCuento(titulo: string): string {
    return (
      (titulo || 'cuento-familiar')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'cuento-familiar'
    );
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

  private formatearCuento(raw: string, promptOriginal: string): void {
    const bloques = raw
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);

    if (bloques.length > 1 && bloques[0].length < 95 && !bloques[0].endsWith('.')) {
      this.tituloCuento = bloques[0].replace(/^#+\s*|\*\*/g, '').trim();
      this.parrafosCuento = bloques.slice(1).map((p) => p.replace(/\*\*/g, '').trim());
    } else {
      this.tituloCuento = `Un cuento sobre: ${promptOriginal}`;
      this.parrafosCuento =
        bloques.length > 0
          ? bloques.map((p) => p.replace(/\*\*/g, '').trim())
          : [raw.replace(/\*\*/g, '').trim()];
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
    this.claveGuardada = Boolean((token ?? '').trim());
    if (this.claveGuardada) {
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
