import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, forkJoin, from, of, throwError, timer } from 'rxjs';
import { catchError, map, retry, switchMap, timeout } from 'rxjs/operators';
import { GoogleGenAI } from '@google/genai';

export interface OpcionesCuento {
  protagonistas?: string;
  lugar?: string;
  tono?: string;
}

export type IdiomaIa = 'es' | 'val';

interface GithubDirItem {
  name: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class IaFamiliaService {
  private readonly storageKey = 'gemini_familia_api_key';
  // private readonly modeloDefecto = 'gemini-flash-latest';
  // private readonly modeloDefecto = 'gemini-2.5-flash';
  // private readonly modeloDefecto = 'gemini-3.8-flash';
  // private readonly modeloDefecto = 'gemini-3.5-flash-lite';
  // private readonly modeloDefecto = 'gemini-3.1-flash-lite-preview';
  // private readonly modeloDefecto = 'gemini-2.5-flash';

// Quiero un cuento para niños de 6 años, con protagonistas a Mateu y Marina, que son piratas en Menorca y Formentera.
  private readonly modelosCandidatos = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.8-flash',
    'gemini-2.5-flash'
  ];

  private readonly modelosImagenCandidatos = [
    'gemini-2.5-flash-image',
    // 'gemini-2.5-flash-preview-image',
    // 'imagen-3.0-generate-002'
  ];


  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';
  private readonly repoBranch = 'main';

  private readonly viajesRepoFolder = 'src/assets/data/viajes';
  private readonly viajesAssetsFolder = 'assets/data/viajes';

  private readonly relatosRepoFolder = 'src/assets/data/relatos';
  private readonly relatosAssetsFolder = 'assets/data/relatos';

  private readonly MAX_VIAJES_A_TRATAR = 1000;

  constructor(private http: HttpClient) {}

  obtenerApiKey(): string {
    return (localStorage.getItem(this.storageKey) ?? '').trim();
  }

  guardarApiKey(clave: string): void {
    const limpia = (clave ?? '').trim();
    if (limpia) {
      localStorage.setItem(this.storageKey, limpia);
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  tieneApiKey(): boolean {
    return this.obtenerApiKey().length > 0;
  }

  preguntarFamilia(pregunta: string, idioma: IdiomaIa = 'es'): Observable<string> {
    const preguntaLimpia = (pregunta ?? '').trim();
    if (!preguntaLimpia) {
      return throwError(() => new Error('Escribe una pregunta primero.'));
    }

    return this.obtenerContextoFamiliar().pipe(
      switchMap((contexto) => {
        const instruccionIdioma =
          idioma === 'val'
            ? 'Respon sempre en valencià natural i proper.'
            : 'Responde siempre en español natural y cercano.';

        const systemInstruction = [
          'Eres el asistente familiar de una aplicación web casera.',
          'Responde a las preguntas basándote en los datos proporcionados de la familia (viajes, viajeros, relatos, cumpleaños, frases, recetas, apodos, dibujos).',
          'Si un dato no aparece en la información proporcionada, indícalo con naturalidad sin inventártelo.',
          instruccionIdioma
        ].join(' ');

        const prompt = [
          'DATOS DE LA FAMILIA (FILTRADOS A ESPAÑOL):',
          contexto || '(No hay datos cargados actualmente)',
          '',
          `PREGUNTA: ${preguntaLimpia}`
        ].join('\n');

        return this.llamarGemini(prompt, systemInstruction);
      })
    );
  }

  inventarCuento(opciones: OpcionesCuento, idioma: IdiomaIa = 'es'): Observable<string> {
    return this.obtenerContextoFamiliar().pipe(
      switchMap((contexto) => {
        const instruccionIdioma =
          idioma === 'val'
            ? 'Escriu el conte íntegrament en valencià.'
            : 'Escribe el cuento íntegramente en español.';

        const protagonistas =
          (opciones.protagonistas ?? '').trim() || 'miembros de la familia a elegir libremente';
        const lugar =
          (opciones.lugar ?? '').trim() || 'un lugar de los viajes o un escenario fantástico';
        const tono = (opciones.tono ?? '').trim() || 'tierno y divertido';

        const systemInstruction = [
          'Eres un cuentacuentos creativo para una familia.',
          'Inventa cuentos originales, entretenidos y bien estructurados (con título), inspirándote cuando encaje en los nombres, apodos, lugares o detalles de la familia.',
          instruccionIdioma
        ].join(' ');

        const prompt = [
          'PISTAS Y REFERENCIAS DE LA FAMILIA (opcionales, úsalas con gracia si encajan):',
          contexto || '(Sin datos adicionales)',
          '',
          'PETICIÓN DEL CUENTO:',
          `- Protagonistas: ${protagonistas}`,
          `- Escenario / viaje: ${lugar}`,
          `- Tono: ${tono}`
        ].join('\n');

        return this.llamarGemini(prompt, systemInstruction);
      })
    );
  }

  private llamarGemini(contents: string, systemInstruction: string): Observable<string> {
    const apiKey = this.obtenerApiKey();
    if (!apiKey) {
      return throwError(() => new Error('Falta configurar la clave de Gemini en este navegador.'));
    }

    const intentarConModelos = (indice: number): Observable<string> => {
      const modelo = this.modelosCandidatos[indice];
      if (!modelo) {
        return throwError(() => ({
          status: 503,
          message: 'Todos los modelos intentados devolvieron error temporal (503).'
        }));
      }

      return defer(() => {
        const ai = new GoogleGenAI({ apiKey });
        return from(
          ai.models.generateContent({
            model: modelo,
            contents,
            config: {
              systemInstruction
            }
          })
        );
      }).pipe(
        timeout(30000),
        retry({
          count: 1,
          delay: (error) => {
            const codigo = error?.status ?? error?.error?.code;
            const esTemporal = codigo === 503 || codigo === 429 || error?.status === 'UNAVAILABLE';
            if (!esTemporal) {
              throw error;
            }
            return timer(1000);
          }
        }),
        map((response) => {
          const texto = (response?.text ?? '').trim();
          if (!texto) {
            throw new Error('La IA no ha devuelto texto.');
          }
          return texto;
        }),
        catchError((err) => {
          const codigo = err?.status ?? err?.error?.code;
          const esRecuperable =
            codigo === 503 ||
            codigo === 429 ||
            codigo === 404 ||
            err?.status === 'UNAVAILABLE' ||
            err?.name === 'TimeoutError';

          if (esRecuperable && indice + 1 < this.modelosCandidatos.length) {
            return intentarConModelos(indice + 1);
          }
          return throwError(() => err);
        })
      );
    };

    return intentarConModelos(0);
  }

  private obtenerContextoFamiliar(): Observable<string> {
    const leerJsonEs = (ruta: string) =>
      this.http.get<unknown>(ruta).pipe(
        catchError(() => of(null)),
        map((data) => (data ? this.extraerSoloEs(data) : null))
      );

    return forkJoin({
      viajesResumen: this.cargarViajesEs(),
      relatosResumen: this.cargarRelatosEs(),
      viajeros: leerJsonEs('assets/data/viajeros.json'),
      cumpleanyos: leerJsonEs('assets/data/cumpleanyos.json'),
      recetas: leerJsonEs('assets/data/recetas.json'),
      preguntas: leerJsonEs('assets/data/preguntas.json'),
      frases: leerJsonEs('assets/data/frases.json'),
      apodos: leerJsonEs('assets/data/apodos.json'),
      dibujos: leerJsonEs('assets/data/dibujos.json')
    }).pipe(
      map((datos) => {
        const partes: string[] = [];

        if (datos.viajesResumen) {
          partes.push(`VIAJES (fechas, destinos y datos en ES):\n${datos.viajesResumen}`);
        }
        if (datos.viajeros) {
          partes.push(`VIAJEROS: ${this.resumirTexto(datos.viajeros, 1500)}`);
        }
        if (datos.relatosResumen) {
          partes.push(`RELATOS (descripciones en ES):\n${datos.relatosResumen}`);
        }
        if (datos.cumpleanyos) {
          partes.push(`CUMPLEAÑOS: ${this.resumirTexto(datos.cumpleanyos, 1600)}`);
        }
        if (datos.recetas) {
          partes.push(`RECETAS: ${this.resumirTexto(datos.recetas, 1400)}`);
        }
        if (datos.preguntas) {
          partes.push(`PREGUNTAS: ${this.resumirTexto(datos.preguntas, 1100)}`);
        }
        if (datos.frases) {
          partes.push(`FRASES: ${this.resumirTexto(datos.frases, 1200)}`);
        }
        if (datos.apodos) {
          partes.push(`APODOS: ${this.resumirTexto(datos.apodos, 1100)}`);
        }
        if (datos.dibujos) {
          partes.push(`DIBUJOS: ${this.resumirTexto(datos.dibujos, 1100)}`);
        }

        return partes.join('\n\n');
      })
    );
  }

  private cargarViajesEs(): Observable<string> {
    return this.listarJsonEnCarpeta(this.viajesRepoFolder).pipe(
      switchMap((archivos) => {
        if (archivos.length === 0) {
          return of('');
        }

        const ordenados = [...archivos].sort((a, b) => b.localeCompare(a)).slice(0, this.MAX_VIAJES_A_TRATAR);

        const peticiones = ordenados.map((nombreArchivo) =>
          this.http.get<unknown>(`${this.viajesAssetsFolder}/${nombreArchivo}`).pipe(
            catchError(() => of(null)),
            map((jsonViaje) => {
              if (!jsonViaje) {
                return '';
              }
              const info = this.resumirViajeEs(nombreArchivo, jsonViaje);
              return `- ${info}`;
            })
          )
        );

        return forkJoin(peticiones).pipe(
          map((lineas) => lineas.filter(Boolean).join('\n'))
        );
      })
    );
  }

  private cargarRelatosEs(): Observable<string> {
    return this.listarJsonEnCarpeta(this.relatosRepoFolder).pipe(
      switchMap((archivos) => {
        if (archivos.length === 0) {
          return of('');
        }

        const peticiones = archivos.map((nombreArchivo) =>
          this.http.get<unknown>(`${this.relatosAssetsFolder}/${nombreArchivo}`).pipe(
            catchError(() => of(null)),
            map((jsonRelato) => {
              if (!jsonRelato) {
                return '';
              }
              const descripcionesEs = this.extraerDescripcionesEs(jsonRelato);
              const contenido = descripcionesEs || this.extraerSoloEs(jsonRelato);
              return `- ${nombreArchivo}: ${this.resumirTexto(contenido, 900)}`;
            })
          )
        );

        return forkJoin(peticiones).pipe(
          map((lineas) => lineas.filter(Boolean).join('\n'))
        );
      })
    );
  }

  private listarJsonEnCarpeta(repoFolder: string): Observable<string[]> {
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${repoFolder}?ref=${this.repoBranch}`;
    return this.http.get<GithubDirItem[]>(apiUrl).pipe(
      catchError(() => of([] as GithubDirItem[])),
      map((items) =>
        (Array.isArray(items) ? items : [])
          .filter((item) => item.type === 'file' && item.name.toLowerCase().endsWith('.json'))
          .map((item) => item.name)
      )
    );
  }

  private resumirViajeEs(nombreArchivo: string, data: unknown): string {
    const metaNombre = this.parsearFechaYDestinoDeNombre(nombreArchivo);
    const limpioEs = this.extraerSoloEs(data);

    const obj =
      limpioEs && typeof limpioEs === 'object' && !Array.isArray(limpioEs)
        ? (limpioEs as Record<string, unknown>)
        : {};

    const fecha =
      this.buscarCampoTexto(obj, ['fecha', 'date', 'anyo', 'año']) || metaNombre.fecha;
    const destino =
      this.buscarCampoTexto(obj, ['destino', 'ciudad', 'lugar', 'titulo', 'nombre']) ||
      metaNombre.destino;
    const viajeros = this.buscarCampoTexto(obj, ['viajeros', 'personas', 'asistentes']);

    const partes: string[] = [];
    if (fecha) partes.push(`Fecha: ${fecha}`);
    if (destino) partes.push(`Destino: ${destino}`);
    if (viajeros) partes.push(`Viajeros: ${viajeros}`);

    const resto = this.resumirTexto(limpioEs, 400);
    if (resto) partes.push(`Detalles(ES): ${resto}`);

    return partes.join(' | ');
  }

  private parsearFechaYDestinoDeNombre(nombreArchivo: string): { fecha: string; destino: string } {
    const sinExt = nombreArchivo.replace(/\.json$/i, '');
    const match = sinExt.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    if (!match) {
      return { fecha: '', destino: sinExt.replace(/-/g, ' ') };
    }
    return {
      fecha: match[1],
      destino: match[2].replace(/-/g, ' ')
    };
  }

  private buscarCampoTexto(obj: Record<string, unknown>, claves: string[]): string {
    for (const clave of claves) {
      const val = obj[clave];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
      if (Array.isArray(val) && val.length > 0) {
        const textos = val
          .map((item) => (typeof item === 'string' ? item : this.resumirTexto(this.extraerSoloEs(item), 120)))
          .filter(Boolean);
        if (textos.length > 0) {
          return textos.join(', ');
        }
      }
    }
    return '';
  }

  private extraerDescripcionesEs(nodo: unknown): unknown {
    if (!nodo || typeof nodo !== 'object') {
      return null;
    }

    if (Array.isArray(nodo)) {
      const recogidos = nodo
        .map((item) => this.extraerDescripcionesEs(item))
        .filter((v) => v !== null && v !== undefined && v !== '');
      return recogidos.length > 0 ? recogidos : null;
    }

    const obj = nodo as Record<string, unknown>;
    const resultados: Record<string, unknown> = {};

    for (const [clave, valor] of Object.entries(obj)) {
      const claveLower = clave.toLowerCase();
      if (claveLower.includes('descrip') || claveLower.includes('texto') || claveLower.includes('relato')) {
        const esVal = this.extraerSoloEs(valor);
        if (esVal !== null && esVal !== undefined && esVal !== '') {
          resultados[clave] = esVal;
        }
      } else if (typeof valor === 'object' && valor !== null) {
        const anidado = this.extraerDescripcionesEs(valor);
        if (anidado !== null && anidado !== undefined && anidado !== '') {
          resultados[clave] = anidado;
        }
      }
    }

    return Object.keys(resultados).length > 0 ? resultados : null;
  }

  /**
   * Extrae únicamente el contenido en español ('es') cuando encuentra objetos bilingües
   * (ej. { es: '...', val: '...' }) y descarta claves de otros idiomas como 'val' o 'ca'.
   */
  private extraerSoloEs(nodo: unknown): unknown {
    if (nodo === null || nodo === undefined) {
      return null;
    }

    if (typeof nodo === 'string' || typeof nodo === 'number' || typeof nodo === 'boolean') {
      return nodo;
    }

    if (Array.isArray(nodo)) {
      const limpios = nodo
        .map((item) => this.extraerSoloEs(item))
        .filter((item) => item !== null && item !== undefined && item !== '');
      return limpios;
    }

    const obj = nodo as Record<string, unknown>;
    const claves = Object.keys(obj);
    const clavesLower = claves.map((k) => k.toLowerCase());

    // Si el objeto tiene explícitamente clave 'es' (ej. { es: '...', val: '...' })
    const claveEs = claves.find((k) => k.toLowerCase() === 'es');
    const tieneOtrosIdiomas = clavesLower.some((k) => k === 'val' || k === 'ca' || k === 'en' || k === 'fr');

    if (claveEs && (tieneOtrosIdiomas || claves.length <= 3)) {
      return this.extraerSoloEs(obj[claveEs]);
    }

    const resultado: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(obj)) {
      const cLower = clave.toLowerCase();
      // Ignoramos claves exclusivas de otros idiomas si no son 'es'
      if (cLower === 'val' || cLower === 'ca' || cLower === 'en' || cLower === 'fr') {
        continue;
      }
      const valorLimpio = this.extraerSoloEs(valor);
      if (valorLimpio !== null && valorLimpio !== undefined && valorLimpio !== '') {
        resultado[clave] = valorLimpio;
      }
    }

    return resultado;
  }

  private resumirTexto(valor: unknown, maxChars: number): string {
    if (valor === null || valor === undefined) {
      return '';
    }
    const texto = typeof valor === 'string' ? valor : JSON.stringify(valor);
    if (!texto) {
      return '';
    }
    return texto.length > maxChars ? `${texto.slice(0, maxChars)}...` : texto;
  }

  generarIlustracionCuento(
    rutaImagenReferencia: string,
    descripcionEscena: string
  ): Observable<string> {
    const apiKey = this.obtenerApiKey();
    if (!apiKey) {
      throw new Error('Falta configurar el token / clave de IA.');
    }

    return this.obtenerBase64YTipoDesdeAssets(rutaImagenReferencia).pipe(
      switchMap(({ base64, mimeType }) => {
        const ai = new GoogleGenAI({ apiKey });

        return from(
          ai.models.generateContent({
            // Usa el modelo de generación de imágenes habilitado en tu proyecto de AI Studio
            model: 'gemini-2.5-flash-image',
            contents: [
              {
                inlineData: {
                  mimeType,
                  data: base64
                }
              },
              {
                text: `Crea una ilustración de cuento infantil cálida, colorida y amigable basada en la persona o lugar de la imagen de referencia. Escena: ${descripcionEscena}`
              }
            ]
          })
        );
      }),
      map((response) => {
        const candidates = (response as any)?.candidates ?? [];
        const parts = candidates[0]?.content?.parts ?? (response as any)?.parts ?? [];
        const imgPart = parts.find((p: any) => p?.inlineData?.data);

        if (!imgPart?.inlineData?.data) {
          throw new Error('El modelo no devolvió ninguna imagen.');
        }

        const mime = imgPart.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${imgPart.inlineData.data}`;
      })
    );
  }

  private obtenerBase64YTipoDesdeAssets(
    ruta: string
  ): Observable<{ base64: string; mimeType: string }> {
    return this.http.get(ruta, { responseType: 'blob' }).pipe(
      switchMap(
        (blob) =>
          new Observable<{ base64: string; mimeType: string }>((observer) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const resultado = String(reader.result || '');
              const partes = resultado.split(',');
              const base64 = partes[1] || '';
              const mimeType = blob.type || 'image/jpeg';
              observer.next({ base64, mimeType });
              observer.complete();
            };
            reader.onerror = (err) => observer.error(err);
            reader.readAsDataURL(blob);
          })
      )
    );
  }

  generarIlustracionParaCuento(promptCuento: string): Observable<string | null> {
    const apiKey = this.obtenerApiKey();
    if (!apiKey) {
      return of(null);
    }

    const textoNormalizado = this.normalizarTexto(promptCuento);

    return forkJoin({
      fotosPerfiles: this.buscarFotosPerfilesPorPrompt(textoNormalizado),
      fotosViajes: this.buscarFotosViajesPorPrompt(textoNormalizado)
    }).pipe(
      switchMap(({ fotosPerfiles, fotosViajes }) => {
        // Limitamos a 3 imágenes de referencia en total (ej. perfiles + viajes) para mantenerlo ágil
        const rutasReferencia = [...fotosPerfiles, ...fotosViajes]
          .filter(Boolean)
          .slice(0, 3);

        if (rutasReferencia.length === 0) {
          return of(null);
        }

        const cargas = rutasReferencia.map((ruta) =>
          this.obtenerBase64YTipoDesdeAssets(ruta).pipe(catchError(() => of(null)))
        );

        return forkJoin(cargas).pipe(
          switchMap((imagenesCargadas) => {
            const validas = imagenesCargadas.filter(
              (img): img is { base64: string; mimeType: string } => Boolean(img && img.base64)
            );

            if (validas.length === 0) {
              return of(null);
            }

            const partesContenido: any[] = validas.map((img) => ({
              inlineData: {
                mimeType: img.mimeType,
                data: img.base64
              }
            }));

            partesContenido.push({
              text: [
                'Crea una única ilustración de cuento infantil colorida, alegre y tierna, inspirada en las personas de las fotos de perfil y los lugares/escenarios de las fotos de viaje proporcionadas.',
                `Petición del cuento: ${promptCuento}`,
                'Estilo: ilustración infantil de libro de cuentos, amigable, luminosa, sin texto ni marcas de agua.'
              ].join(' ')
            });

            return this.probarModelosImagen(apiKey, partesContenido, 0);
          })
        );
      }),
      catchError(() => of(null))
    );
  }

  private probarModelosImagen(
    apiKey: string,
    partesContenido: any[],
    indice: number
  ): Observable<string | null> {
    const modelo = this.modelosImagenCandidatos[indice];
    if (!modelo) {
      return of(null);
    }

    const ai = new GoogleGenAI({ apiKey });

    return from(
      ai.models.generateContent({
        model: modelo,
        contents: partesContenido
      })
    ).pipe(
      timeout(30000),
      map((response) => {
        const candidates = (response as any)?.candidates ?? [];
        const parts = candidates[0]?.content?.parts ?? (response as any)?.parts ?? [];
        const imgPart = parts.find((p: any) => p?.inlineData?.data);

        if (!imgPart?.inlineData?.data) {
          throw new Error(`El modelo ${modelo} no devolvió ninguna imagen.`);
        }

        const mime = imgPart.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${imgPart.inlineData.data}`;
      }),
      catchError(() => {
        if (indice + 1 < this.modelosImagenCandidatos.length) {
          return this.probarModelosImagen(apiKey, partesContenido, indice + 1);
        }
        return of(null);
      })
    );
  }

  private buscarFotosPerfilesPorPrompt(textoNormalizado: string): Observable<string[]> {
    return this.http.get<any[]>('assets/data/viajeros.json').pipe(
      catchError(() => of([])),
      map((viajeros) => {
        if (!Array.isArray(viajeros)) {
          return [];
        }

        const fotos: string[] = [];
        for (const v of viajeros) {
          const nombresPosibles: string[] = [];
          if (v?.nombre) nombresPosibles.push(String(v.nombre));
          if (v?.nombreCompleto) nombresPosibles.push(String(v.nombreCompleto));
          if (Array.isArray(v?.aka)) {
            for (const alias of v.aka) {
              if (alias) nombresPosibles.push(String(alias));
            }
          }

          const coincide = nombresPosibles.some((n) => {
            const limpio = this.normalizarTexto(n);
            return limpio.length >= 2 && textoNormalizado.includes(limpio);
          });

          if (coincide && typeof v?.fotoPerfil === 'string' && v.fotoPerfil.trim()) {
            fotos.push(this.normalizarRutaAsset(v.fotoPerfil.trim()));
          }
        }

        return Array.from(new Set(fotos));
      })
    );
  }

  private buscarFotosViajesPorPrompt(textoNormalizado: string): Observable<string[]> {
    return this.listarJsonEnCarpeta(this.viajesRepoFolder).pipe(
      switchMap((archivos) => {
        if (!archivos.length) {
          return of([]);
        }

        // Filtramos archivos cuyo nombre contenga alguna palabra clave del prompt (ej. menorca, formentera)
        const palabrasClave = textoNormalizado
          .split(/[^a-z0-9]+/)
          .filter((p) => p.length >= 4 && !['cuento', 'ninos', 'anos', 'para', 'con', 'que', 'son', 'los', 'las', 'unos', 'unas'].includes(p));

        const archivosCoincidentes = archivos.filter((nombreArchivo) => {
          const nombreNorm = this.normalizarTexto(nombreArchivo);
          return palabrasClave.some((palabra) => nombreNorm.includes(palabra));
        });

        const candidatos = (archivosCoincidentes.length > 0 ? archivosCoincidentes : archivos).slice(0, 4);

        const peticiones = candidatos.map((archivo) =>
          this.http.get<any>(`${this.viajesAssetsFolder}/${archivo}`).pipe(
            catchError(() => of(null)),
            map((jsonViaje) => {
              if (!jsonViaje) return '';
              const textoViaje = this.normalizarTexto(JSON.stringify(jsonViaje));
              const encajaConPrompt =
                archivosCoincidentes.includes(archivo) ||
                palabrasClave.some((p) => textoViaje.includes(p));

              if (!encajaConPrompt) return '';
              return this.extraerPrimeraFotoDeViaje(jsonViaje);
            })
          )
        );

        return forkJoin(peticiones).pipe(
          map((urls) => Array.from(new Set(urls.filter(Boolean))))
        );
      })
    );
  }

  private extraerPrimeraFotoDeViaje(jsonViaje: any): string {
    const candidatosDirectos = [
      jsonViaje?.foto,
      jsonViaje?.imagen,
      jsonViaje?.portada,
      jsonViaje?.fotoPortada
    ];

    for (const c of candidatosDirectos) {
      if (typeof c === 'string' && c.trim()) {
        return this.normalizarRutaAsset(c.trim());
      }
    }

    const arraysPosibles = [
      jsonViaje?.fotos,
      jsonViaje?.imagenes,
      jsonViaje?.galeria
    ];

    for (const arr of arraysPosibles) {
      if (Array.isArray(arr) && arr.length > 0) {
        const primero = arr[0];
        if (typeof primero === 'string' && primero.trim()) {
          return this.normalizarRutaAsset(primero.trim());
        }
        if (primero && typeof primero === 'object') {
          const posibleCampo = primero.src || primero.url || primero.ruta || primero.imagen || primero.foto;
          if (typeof posibleCampo === 'string' && posibleCampo.trim()) {
            return this.normalizarRutaAsset(posibleCampo.trim());
          }
        }
      }
    }

    return '';
  }

  private normalizarRutaAsset(ruta: string): string {
    if (ruta.startsWith('http') || ruta.startsWith('assets/') || ruta.startsWith('/assets/')) {
      return ruta.replace(/^\/+/, '');
    }
    return `assets/${ruta.replace(/^\/+/, '')}`;
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }


  crearCollageDesdePrompt(promptCuento: string): Observable<string | null> {
    const textoNormalizado = this.normalizarTexto(promptCuento);

    return forkJoin({
      fotosPerfiles: this.buscarFotosPerfilesPorPrompt(textoNormalizado),
      fotosViajes: this.buscarFotosViajesPorPrompt(textoNormalizado)
    }).pipe(
      switchMap(({ fotosPerfiles, fotosViajes }) => {
        // Combinamos perfiles y viajes (máximo 4 fotos para un collage equilibrado)
        const rutas = Array.from(new Set([...fotosPerfiles, ...fotosViajes]))
          .filter(Boolean)
          .slice(0, 4);

        if (rutas.length === 0) {
          return of(null);
        }

        const cargas = rutas.map((ruta) =>
          this.cargarImagenHtml(ruta).pipe(catchError(() => of(null)))
        );

        return forkJoin(cargas).pipe(
          map((imgs) => {
            const validas = imgs.filter((img): img is HTMLImageElement => Boolean(img));
            if (validas.length === 0) {
              return null;
            }
            return this.dibujarCollageEnCanvas(validas);
          })
        );
      }),
      catchError(() => of(null))
    );
  }

  private cargarImagenHtml(ruta: string): Observable<HTMLImageElement | null> {
    return new Observable<HTMLImageElement | null>((observer) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        observer.next(img);
        observer.complete();
      };
      img.onerror = () => {
        observer.next(null);
        observer.complete();
      };
      img.src = ruta;
    });
  }

  private dibujarCollageEnCanvas(imgs: HTMLImageElement[]): string | null {
    if (typeof document === 'undefined' || imgs.length === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const ancho = 900;
    const alto = 540;
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    // Fondo cálido estilo álbum/cuento
    const gradiente = ctx.createLinearGradient(0, 0, ancho, alto);
    gradiente.addColorStop(0, '#fffbeb');
    gradiente.addColorStop(1, '#fef3c7');
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, ancho, alto);

    const padding = 18;
    const gap = 14;
    const count = imgs.length;

    const celdas: Array<{ x: number; y: number; w: number; h: number }> = [];

    if (count === 1) {
      celdas.push({
        x: padding,
        y: padding,
        w: ancho - padding * 2,
        h: alto - padding * 2
      });
    } else if (count === 2) {
      const w = (ancho - padding * 2 - gap) / 2;
      const h = alto - padding * 2;
      celdas.push({ x: padding, y: padding, w, h });
      celdas.push({ x: padding + w + gap, y: padding, w, h });
    } else if (count === 3) {
      const izquierdaW = (ancho - padding * 2 - gap) * 0.55;
      const derechaW = ancho - padding * 2 - gap - izquierdaW;
      const derechaH = (alto - padding * 2 - gap) / 2;

      celdas.push({ x: padding, y: padding, w: izquierdaW, h: alto - padding * 2 });
      celdas.push({ x: padding + izquierdaW + gap, y: padding, w: derechaW, h: derechaH });
      celdas.push({
        x: padding + izquierdaW + gap,
        y: padding + derechaH + gap,
        w: derechaW,
        h: derechaH
      });
    } else {
      const w = (ancho - padding * 2 - gap) / 2;
      const h = (alto - padding * 2 - gap) / 2;
      celdas.push({ x: padding, y: padding, w, h });
      celdas.push({ x: padding + w + gap, y: padding, w, h });
      celdas.push({ x: padding, y: padding + h + gap, w, h });
      celdas.push({ x: padding + w + gap, y: padding + h + gap, w, h });
    }

    imgs.slice(0, celdas.length).forEach((img, idx) => {
      const celda = celdas[idx];
      ctx.save();
      this.trazarRectanguloRedondeado(ctx, celda.x, celda.y, celda.w, celda.h, 16);
      ctx.clip();

      // Ajuste tipo "object-fit: cover" sin deformar
      const imgRatio = img.width / img.height;
      const celdaRatio = celda.w / celda.h;

      let drawW = celda.w;
      let drawH = celda.h;
      let drawX = celda.x;
      let drawY = celda.y;

      if (imgRatio > celdaRatio) {
        drawW = celda.h * imgRatio;
        drawX = celda.x - (drawW - celda.w) / 2;
      } else {
        drawH = celda.w / imgRatio;
        drawY = celda.y - (drawH - celda.h) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Borde suave alrededor de cada foto
      ctx.save();
      this.trazarRectanguloRedondeado(ctx, celda.x, celda.y, celda.w, celda.h, 16);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.stroke();
      ctx.restore();
    });

    return canvas.toDataURL('image/jpeg', 0.88);
  }

  private trazarRectanguloRedondeado(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radio = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radio, y);
    ctx.arcTo(x + w, y, x + w, y + h, radio);
    ctx.arcTo(x + w, y + h, x, y + h, radio);
    ctx.arcTo(x, y + h, x, y, radio);
    ctx.arcTo(x, y, x + w, y, radio);
    ctx.closePath();
  }


}
