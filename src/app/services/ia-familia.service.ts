import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, defer, forkJoin, from, of, throwError, timer } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap, timeout } from 'rxjs/operators';
import { GoogleGenAI } from '@google/genai';

export interface OpcionesCuento {
  protagonistas?: string;
  lugar?: string;
  tono?: string;
  estiloVisual?: string;
}

export type IdiomaIa = 'es' | 'val';
export type ProveedorIa = 'groq' | 'gemini';

type Dato = Record<string, any>;

interface GithubDirItem {
  name: string;
  type: string;
}

interface PasoIa {
  proveedor: ProveedorIa;
  modelo: string;
  clave: string;
}

interface OpcionesGeneracion {
  temperatura: number;
  maxTokens: number;
}

interface Tema {
  disparadores: string[];
  afines: string[];
  opuestos?: string[];
}

interface ConsultaAnalizada {
  norm: string;
  crudas: Set<string>;
  palabras: Set<string>;
  relleno: string;
  tokens: string[];
  temas: Tema[];
}

interface ViajeIndexado {
  archivo: string;
  anyo: string;
  destino: string;
  categoria: string;
  provincia: string;
  pais: string;
  estancia: string;
  transporte: string;
  personas: string[];
  foto: string;
  resumen: string;
  claves: string;
}

interface IndiceGuardado {
  version: number;
  creado: number;
  viajes: ViajeIndexado[];
}

interface RelatoIndexado {
  archivo: string;
  texto: string;
  claves: string;
}

interface Persona {
  id: string;
  nombre: string;
  aka: string[];
  nacimiento: { y: number; m?: number; d?: number } | null;
  nucleo: boolean;
  rol?: string;
  relaciones?: string;
  rasgos: string[];
  detalles: string[];
}

interface ConfigCloudflareImagen {
  accountId: string;
  apiToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class IaFamiliaService {
  // ───────────────────────── Claves ─────────────────────────
  private readonly storageKey = 'gemini_familia_api_key';
  private readonly storageKeyGroq = 'groq_familia_api_key';
  private readonly storageKeyHuggingFace = 'huggingface_familia_api_key';
  private readonly storageKeyPollinations = 'pollinations_familia_api_key';
  private readonly storageKeyCloudflareImagen = 'cloudflare_imagen_api_key';
  //OLD
  private readonly storageKeyImagen = 'imagen_familia_api_key';

  private readonly cloudflareAccountIdPorDefecto = '';

  // ───────────────────────── Proveedores y modelos ─────────────────────────
  private readonly ordenProveedores: ProveedorIa[] = ['groq', 'gemini'];
  private readonly modelosGroq = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile'
  ];
  private readonly modelosGemini = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];

  private readonly modelosImagenCloudflare = [
    '@cf/black-forest-labs/flux-1-schnell',
    '@cf/stabilityai/stable-diffusion-xl-base-1.0'
  ];

  private readonly modelosImagenHuggingFace = [
    // 'black-forest-labs/FLUX.1-Krea-dev',
    // 'Qwen/Qwen-Image',
    // 'Tongyi-MAI/Z-Image-Turbo'
  ];

  private readonly timeoutHuggingFaceImagenMs = 45000;
  private readonly timeoutPollinationsImagenMs = 35000;

  private readonly timeoutGroqMs = 20000;
  private readonly timeoutGeminiMs = 25000;
  private readonly timeoutCloudflareImagenMs = 35000;

  private readonly modelosImagenPuter: Array<{ model?: string; quality?: 'low' | 'medium' | 'high' }> = [
    { model: 'openai/gpt-image-2.6-flare', quality: 'low' },
    { model: 'google/gemini-3.1-flash-lite-image' },
    {}
  ];

  readonly estilosIlustracionCuento: Array<{ nombre: string; prompt: string }> = [
    {
      nombre: 'Acuarela cálida',
      prompt: 'Ilustración de álbum infantil en acuarela cálida y luminosa, pinceladas suaves y bordes delicados'
    },
    {
      nombre: 'Animación 3D',
      prompt: 'Estilo animación 3D de película familiar moderna, iluminación suave, texturas táctiles y personajes expresivos'
    },
    {
      nombre: 'Cómic manga',
      prompt: 'Estilo cómic manga colorido y expresivo para público familiar, línea limpia, ojos grandes y viñeta viva'
    },
    {
      nombre: 'Cómic de superhéroes',
      prompt: 'Estilo cómic de aventuras y superhéroes familiares, colores vibrantes, tinta dinámica y encuadre heroico amable'
    },
    {
      nombre: 'Gouache pastel',
      prompt: 'Pintura al gouache en tonos pastel suaves, atmósfera tierna y acogedora de cuento ilustrado'
    },
    {
      nombre: 'Lápiz y acuarela',
      prompt: 'Ilustración a lápiz de color y acuarela ligera sobre papel verjurado, trazo artesanal y encanto familiar'
    },
    {
      nombre: 'Papel recortado (cutout)',
      prompt: 'Estilo collage de papel recortado a mano con capas y relieve suave, estética artesanal de cuento infantil'
    },
    {
      nombre: 'Aventura retro vintage',
      prompt: 'Estilo ilustración retro vintage de viajes clásicos, paleta cálida nostálgica y gran detalle de escenario'
    }
  ];

  private readonly cierreEstiloComun =
    'personajes coherentes, escena clara y acogedora, sin texto, sin letras, sin bocadillos ni marcas de agua.';

    ultimoProveedorUsado = '';

    private readonly enfriamiento = new Map<string, number>();
    private ultimoViajeUsadoArchivo = '';
    private readonly ultimosApodosPorPersona = new Map<string, string>();
    private ultimasFrasesUsadas: string[] = [];

  // ───────────────────────── GitHub / datos ─────────────────────────
  private readonly cacheCarpetasGithub = new Map<string, string[]>();
  private readonly cacheJson = new Map<string, Observable<unknown>>();
  private indiceViajes$?: Observable<ViajeIndexado[]>;
  private relatos$?: Observable<RelatoIndexado[]>;
  private puterPromesa?: Promise<any>;

  private readonly repoOwner = 'Albs1985';
  private readonly repoName = 'travelBlog';
  private readonly repoBranch = 'main';

  private readonly viajesRepoFolder = 'src/assets/data/viajes';
  private readonly viajesAssetsFolder = 'assets/data/viajes';
  private readonly relatosRepoFolder = 'src/assets/data/relatos';
  private readonly relatosAssetsFolder = 'assets/data/relatos';

  private readonly MAX_VIAJES_A_TRATAR = 1000;

  private readonly storageIndice = 'ia_indice_viajes';
  private readonly versionIndice = 1;
  private readonly ttlIndiceMs = 12 * 3600 * 1000;

  private readonly MAX_CHARS_CUENTO = 9000;
  private readonly MAX_CHARS_CHAT = 6500;

  private readonly STOPWORDS = new Set([
    'cuento', 'conte', 'historia', 'historias', 'sobre', 'para', 'como', 'pero', 'unos', 'unas',
    'estos', 'estas', 'esta', 'este', 'esto', 'quiero', 'dame', 'cuentame', 'crea', 'inventa',
    'escribe', 'aventura', 'aventuras', 'donde', 'cuando', 'porque', 'tambien', 'entre', 'hacia',
    'desde', 'todos', 'todas', 'familia', 'nino', 'ninos', 'nina', 'ninas', 'hijo', 'hijos',
    'amb', 'per', 'els', 'les', 'una', 'del', 'que', 'sus', 'nos', 'con', 'por', 'los', 'las',
    'viaje', 'viajes', 'quien', 'quienes', 'cual', 'cuales', 'cuantos', 'cuantas', 'tiene', 'tienen',
    'fue', 'fueron', 'hay', 'dime', 'cuenta', 'puedes', 'pueden', 'algo', 'alguna', 'alguno'
  ]);

  private readonly temas: Tema[] = [
    {
      disparadores: ['pirata', 'mar', 'playa', 'cala', 'isla', 'barco', 'velero', 'buceo', 'snorkel', 'arena', 'sirena', 'tesoro', 'submarino', 'ola'],
      afines: ['playa', 'cala', 'isla', 'menorca', 'formentera', 'mallorca', 'ibiza', 'costa', 'barco', 'puerto', 'faro', 'snorkel', 'buceo', 'chiringuito'],
      opuestos: ['nieve', 'esqui', 'museo', 'catedral']
    },
    {
      disparadores: ['nieve', 'esqui', 'trineo', 'invierno', 'hielo', 'frio', 'muneco', 'copo'],
      afines: ['nieve', 'esqui', 'invierno', 'hielo', 'frio', 'pirineo', 'sierra nevada', 'andorra', 'trineo'],
      opuestos: ['playa', 'cala', 'chiringuito', 'snorkel']
    },
    {
      disparadores: ['montana', 'senderismo', 'cumbre', 'bosque', 'valle', 'rio', 'cueva', 'camping', 'excursion', 'ruta', 'sierra', 'volcan'],
      afines: ['montana', 'sierra', 'pico', 'valle', 'bosque', 'senderismo', 'ruta', 'camping', 'cueva', 'rio', 'cascada'],
      opuestos: ['playa', 'cala', 'chiringuito']
    },
    {
      disparadores: ['ciudad', 'museo', 'castillo', 'palacio', 'plaza', 'mercado', 'capital', 'metro', 'monumento', 'catedral'],
      afines: ['ciudad', 'capital', 'museo', 'palacio', 'plaza', 'catedral', 'castillo', 'centro']
    },
    {
      disparadores: ['fiesta', 'cumple', 'boda', 'concierto', 'fallas', 'verbena', 'baile', 'festival'],
      afines: ['fiesta', 'boda', 'cumple', 'concierto', 'festival', 'fallas', 'feria', 'verbena']
    },
    {
      disparadores: ['animal', 'zoo', 'granja', 'dinosaurio', 'safari', 'cocodrilo', 'acuario', 'jirafa', 'leon', 'elefante'],
      afines: ['zoo', 'safari', 'granja', 'animal', 'acuario', 'bioparc', 'terra natura']
    },
    {
      disparadores: ['pueblo', 'campo', 'huerto', 'abuelo', 'iaio', 'iaia'],
      afines: ['pueblo', 'campo', 'huerto', 'casa rural', 'abuel', 'iaio', 'iaia']
    }
  ];

  private readonly colectivos: Array<{ palabras: string[]; ids: string[] }> = [
    { palabras: ['nino', 'nina', 'hijo', 'hija', 'peque', 'pequeno', 'hermano', 'hermana', 'xiquet', 'xiqueta', 'crio', 'nen', 'nena', 'ninos', 'hijos', 'hermanos'], ids: ['mateu', 'marina'] },
    { palabras: ['padres', 'papas', 'papis', 'papa', 'mama', 'pare', 'mare', 'padre', 'madre', 'papi', 'mami'], ids: ['albert', 'alba'] },
    { palabras: ['familia', 'todos', 'todas'], ids: ['mateu', 'marina', 'alba', 'albert'] },
    { palabras: ['abuelo', 'abuela', 'abuelos', 'abuelas', 'iaio', 'iaia', 'iaios', 'iaies', 'avi', 'avia', 'avis'], ids: ['pepe', 'ana', 'pep', 'matilde'] }
  ];

  constructor(private http: HttpClient) {}

  obtenerEstiloAleatorioCuento(): { nombre: string; prompt: string } {
    const idx = Math.floor(Math.random() * this.estilosIlustracionCuento.length);
    return this.estilosIlustracionCuento[idx];
  }

  private resolverGuiaEstilo(estiloVisual?: string): string {
    const limpio = (estiloVisual ?? '').trim();
    if (limpio) {
      return `${limpio}, ${this.cierreEstiloComun}`;
    }
    const elegido = this.estilosIlustracionCuento[0];
    return `${elegido.prompt}, ${this.cierreEstiloComun}`;
  }

  // ═════════════════════════════════════════════════════════
  //  CLAVES
  // ═════════════════════════════════════════════════════════

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

  obtenerImagenApiKey(): string {
    return (localStorage.getItem(this.storageKeyImagen) ?? '').trim();
  }

  obtenerTokenHuggingFaceImagen(): string {
    const directo = (localStorage.getItem(this.storageKeyHuggingFace) ?? '').trim();
    if (directo) {
      return directo;
    }
    const legado = this.obtenerImagenApiKey();
    return legado.startsWith('hf_') ? legado : '';
  }

  obtenerApiKeyPollinationsImagen(): string {
    return (localStorage.getItem(this.storageKeyPollinations) ?? '').trim();
  }

  obtenerConfigCloudflareImagen(): ConfigCloudflareImagen | null {
    const directa = (localStorage.getItem(this.storageKeyCloudflareImagen) ?? '').trim();
    const legado = this.obtenerImagenApiKey();
    const cruda = directa || (!legado.startsWith('hf_') ? legado : '');

    if (!cruda) {
      return null;
    }

    const partes = cruda.split(/[:|]+/).map((p) => p.trim()).filter(Boolean);
    if (partes.length >= 2) {
      return { accountId: partes[0], apiToken: partes.slice(1).join(':') };
    }

    if (this.cloudflareAccountIdPorDefecto.trim()) {
      return {
        accountId: this.cloudflareAccountIdPorDefecto.trim(),
        apiToken: cruda
      };
    }

    return null;
  }

  obtenerClaves(): Partial<Record<ProveedorIa, string>> {
    const candidatas = [localStorage.getItem(this.storageKeyGroq), localStorage.getItem(this.storageKey)]
      .flatMap((v) => (v ?? '').split(/[\s,;|]+/))
      .map((v) => v.trim())
      .filter(Boolean);

    const claves: Partial<Record<ProveedorIa, string>> = {};
    for (const c of candidatas) {
      const prov: ProveedorIa = c.startsWith('gsk_') ? 'groq' : 'gemini';
      if (!claves[prov]) {
        claves[prov] = c;
      }
    }
    return claves;
  }

  proveedoresConfigurados(): ProveedorIa[] {
    const claves = this.obtenerClaves();
    return this.ordenProveedores.filter((p) => Boolean(claves[p]));
  }

  tieneApiKey(): boolean {
    return this.proveedoresConfigurados().length > 0;
  }

  // ═════════════════════════════════════════════════════════
  //  API PÚBLICA (TEXTO)
  // ═════════════════════════════════════════════════════════

  preguntarFamilia(pregunta: string, idioma: IdiomaIa = 'es'): Observable<string> {
    const preguntaLimpia = (pregunta ?? '').trim();
    if (!preguntaLimpia) {
      return throwError(() => new Error('Escribe una pregunta primero.'));
    }

    return this.construirContextoChat(preguntaLimpia).pipe(
      switchMap((contexto) => {
        const instruccionIdioma =
          idioma === 'val'
            ? 'Respon sempre en valencià natural i proper.'
            : 'Responde siempre en español natural y cercano.';

        const systemInstruction = [
          'Eres el asistente familiar de una aplicación web casera.',
          'Responde basándote únicamente en los datos de la familia proporcionados (ya filtrados según la pregunta).',
          'Si un dato no aparece, dilo con naturalidad sin inventártelo. Sé breve y cercano.',
          instruccionIdioma
        ].join(' ');

        const prompt = [
          `FECHA DE HOY: ${this.fechaHoy()}`,
          'DATOS DE LA FAMILIA (seleccionados según la pregunta):',
          contexto || '(No hay datos cargados actualmente)',
          '',
          `PREGUNTA: ${preguntaLimpia}`
        ].join('\n');

        return this.generarTexto(prompt, systemInstruction, { temperatura: 0.3, maxTokens: 900 });
      })
    );
  }

  inventarCuento(opciones: OpcionesCuento, idioma: IdiomaIa = 'es'): Observable<string> {
    const protagonistas = (opciones.protagonistas ?? '').trim();
    const lugar = (opciones.lugar ?? '').trim();
    const textoBusqueda = Array.from(new Set([protagonistas, lugar].filter(Boolean))).join(' ');

    return this.construirContextoCuento(textoBusqueda).pipe(
      switchMap((contexto) => {
        const instruccionIdioma =
          idioma === 'val'
            ? 'Escriu el conte íntegrament en valencià.'
            : 'Escribe el cuento íntegramente en español.';

        const tono = (opciones.tono ?? '').trim() || 'tierno y divertido';

        const systemInstruction = [
          'Eres un cuentacuentos creativo para una familia con niños pequeños (3 a 7 años).',
          'Escribe un cuento original, de 5 a 7 párrafos cortos, con hilo narrativo claro y final feliz.',
          'Mantén los nombres y rasgos de los personajes tal como aparecen en los datos.',
          'IMPORTANTE sobre apodos y frases: usa COMO MÁXIMO un apodo por personaje y COMO MÁXIMO una frase/expresión graciosa por personaje en todo el cuento. Repártelos a lo largo del nudo o el desenlace, NUNCA los amontones todos al principio ni hagas que todos suenen igual.',
          'Inspírate de verdad en la narración y el ambiente del viaje seleccionado (lugares, detalles, sensaciones) para dar verosimilitud y variedad, sin copiar literalmente fichas técnicas.',
          'No inventes hechos reales sobre la familia que no estén en los datos; la aventura sí puede ser fantástica.',
          'Formato: la primera línea es el título (sin #, sin asteriscos y sin punto final); después los párrafos separados por una línea en blanco. Sin listas ni comentarios finales.',
          instruccionIdioma
        ].join(' ');

        const peticion =
          protagonistas && protagonistas === lugar
            ? [`- Idea del cuento (personajes, escenario y trama): ${protagonistas}`]
            : [
                `- Protagonistas: ${protagonistas || 'miembros de la familia a elegir libremente'}`,
                `- Escenario / viaje: ${lugar || 'un lugar de los viajes o un escenario fantástico'}`
              ];

        const prompt = [
          `FECHA DE HOY: ${this.fechaHoy()}`,
          'DATOS DE LA FAMILIA Y VIAJES (seleccionados según la temática):',
          contexto || '(Sin datos adicionales)',
          '',
          'PETICIÓN DEL CUENTO:',
          ...peticion,
          `- Tono: ${tono}`
        ].join('\n');

        return this.generarTexto(prompt, systemInstruction, { temperatura: 0.9, maxTokens: 1400 });
      })
    );
  }

  limpiarCacheContexto(): void {
    try {
      localStorage.removeItem(this.storageIndice);
    } catch {
      /* sin storage */
    }
    this.indiceViajes$ = undefined;
    this.relatos$ = undefined;
    this.cacheJson.clear();
    this.cacheCarpetasGithub.clear();
    this.ultimoViajeUsadoArchivo = '';
    this.ultimosApodosPorPersona.clear();
    this.ultimasFrasesUsadas = [];
  }

  // ═════════════════════════════════════════════════════════
  //  ORQUESTACIÓN DE PROVEEDORES DE TEXTO (Groq → Gemini)
  // ═════════════════════════════════════════════════════════

  private generarTexto(prompt: string, system: string, opts: OpcionesGeneracion): Observable<string> {
    const claves = this.obtenerClaves();
    const todos: PasoIa[] = [];

    for (const prov of this.ordenProveedores) {
      const clave = claves[prov];
      if (!clave) continue;
      const modelos = prov === 'groq' ? this.modelosGroq : this.modelosGemini;
      for (const modelo of modelos) {
        todos.push({ proveedor: prov, modelo, clave });
      }
    }

    if (todos.length === 0) {
      return throwError(
        () => new Error('Falta configurar la clave de IA (Groq o Gemini) en este navegador.')
      );
    }

    const libres = todos.filter((p) => !this.estaEnEspera(p));
    const pasos = libres.length > 0 ? libres : todos;
    const errores: any[] = [];
    const proveedoresInvalidos = new Set<ProveedorIa>();

    const intentar = (indiceInicial: number): Observable<string> => {
      let i = indiceInicial;
      while (i < pasos.length && proveedoresInvalidos.has(pasos[i].proveedor)) {
        i++;
      }
      if (i >= pasos.length) {
        return throwError(() => this.elegirErrorFinal(errores));
      }

      const paso = pasos[i];
      return this.llamarPaso(paso, prompt, system, opts).pipe(
        tap(() => {
          this.ultimoProveedorUsado = `${paso.proveedor === 'groq' ? 'Groq' : 'Gemini'} · ${paso.modelo}`;
        }),
        catchError((err) => {
          errores.push(err);
          const info = this.clasificarError(err);
          if (info.autenticacion) {
            proveedoresInvalidos.add(paso.proveedor);
          } else {
            this.ponerEnEspera(paso, info.esperaMs);
          }
          console.warn(`[IA] ${paso.proveedor}/${paso.modelo} falló (${info.codigo}). Probando el siguiente…`);
          return intentar(i + 1);
        })
      );
    };

    return intentar(0);
  }

  private llamarPaso(
    paso: PasoIa,
    prompt: string,
    system: string,
    opts: OpcionesGeneracion
  ): Observable<string> {
    const origen$ =
      paso.proveedor === 'groq'
        ? this.llamarGroq(paso, prompt, system, opts)
        : this.llamarGemini(paso, prompt, system, opts);

    return origen$.pipe(
      timeout(paso.proveedor === 'groq' ? this.timeoutGroqMs : this.timeoutGeminiMs),
      map((texto) => {
        const limpio = (texto ?? '').trim();
        if (!limpio) {
          throw new Error('La IA no ha devuelto texto.');
        }
        return limpio;
      })
    );
  }

  private llamarGroq(
    paso: PasoIa,
    prompt: string,
    system: string,
    opts: OpcionesGeneracion
  ): Observable<string> {
    const body: Record<string, unknown> = {
      model: paso.modelo,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      temperature: opts.temperatura,
      max_completion_tokens: opts.maxTokens
    };

    if (paso.modelo.startsWith('openai/gpt-oss')) {
      body['reasoning_effort'] = 'low';
    }

    return this.http
      .post<any>('https://api.groq.com/openai/v1/chat/completions', body, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${paso.clave}`,
          'Content-Type': 'application/json'
        })
      })
      .pipe(map((resp) => String(resp?.choices?.[0]?.message?.content ?? '')));
  }

  private llamarGemini(
    paso: PasoIa,
    prompt: string,
    system: string,
    opts: OpcionesGeneracion
  ): Observable<string> {
    return defer(() => {
      const ai = new GoogleGenAI({ apiKey: paso.clave });
      return from(
        ai.models.generateContent({
          model: paso.modelo,
          contents: prompt,
          config: { systemInstruction: system, temperature: opts.temperatura }
        })
      );
    }).pipe(map((response) => String(response?.text ?? '')));
  }

  private clasificarError(err: any): { codigo: string | number; autenticacion: boolean; esperaMs: number } {
    const status = err?.status ?? err?.error?.error?.code ?? err?.error?.code;
    const mensaje = String(err?.message ?? err?.error?.error?.message ?? '');
    const esTimeout = err?.name === 'TimeoutError';

    const autenticacion =
      status === 401 ||
      status === 403 ||
      (status === 400 && /api[ _]?key/i.test(mensaje));

    let esperaMs = 20000;
    if (status === 429) {
      const retryAfter = Number(err?.headers?.get?.('retry-after'));
      esperaMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 6 * 3600 * 1000)
          : 60000;
    }

    return { codigo: esTimeout ? 'timeout' : status ?? 'desconocido', autenticacion, esperaMs };
  }

  private elegirErrorFinal(errores: any[]): unknown {
    if (errores.length === 0) {
      return { status: 503, message: 'Todos los modelos intentados devolvieron error temporal.' };
    }
    if (errores.every((e) => this.clasificarError(e).autenticacion)) {
      return errores[0];
    }
    const codigo = (e: any) => e?.status ?? e?.error?.error?.code ?? e?.error?.code;
    const cuota = errores.find((e) => codigo(e) === 429);
    if (cuota) return cuota;
    const sobrecarga = errores.find((e) => codigo(e) === 503 || e?.name === 'TimeoutError');
    if (sobrecarga) return { status: 503, message: String(sobrecarga?.message ?? 'Servicio no disponible') };
    return errores[errores.length - 1];
  }

  private clavePaso(p: PasoIa): string {
    return `${p.proveedor}:${p.modelo}`;
  }

  private estaEnEspera(p: PasoIa): boolean {
    return (this.enfriamiento.get(this.clavePaso(p)) ?? 0) > Date.now();
  }

  private ponerEnEspera(p: PasoIa, ms: number): void {
    this.enfriamiento.set(this.clavePaso(p), Date.now() + ms);
  }

  // ═════════════════════════════════════════════════════════
  //  SELECTOR DE CONTEXTO (sin segunda llamada a IA)
  // ═════════════════════════════════════════════════════════

  private construirContextoCuento(texto: string): Observable<string> {
    const q = this.analizarConsulta(texto);

    return forkJoin({
      viajeros: this.leerJson('assets/data/viajeros.json'),
      personajes: this.leerJson('assets/data/personajes.json'),
      cumple: this.leerJson('assets/data/cumpleanyos.json'),
      frases: this.leerJson('assets/data/frases.json'),
      viajes: this.cargarIndiceViajes(),
      // relatos: this.cargarRelatos().pipe(catchError(() => of([] as RelatoIndexado[])))
    }).pipe(
      map((d) => {
        const personas = this.construirPersonas(d.viajeros, d.personajes, d.cumple);
        const mencionados = this.detectarPersonas(q, personas);
        const partes: string[] = [];

        partes.push(this.bloquePersonajes(personas, mencionados));

        const extendida = this.bloqueExtendida(personas, mencionados);
        if (extendida) partes.push(extendida);

        const viajes = this.seleccionarViajes(d.viajes, q, mencionados, 1, true);
        if (viajes.length) {
          partes.push(
            `VIAJE DE REFERENCIA (un único viaje seleccionado aleatoriamente entre los afines; usa toda su información y narración para ambientar el cuento):\n${viajes
              .map((v) => this.lineaViaje(v))
              .join('\n')}`
          );
        }

        const frases = this.seleccionarFrases(d.frases, q, mencionados, 4);
        if (frases.length) {
          partes.push(
            `FRASES Y PALABRAS GRACIOSAS (máximo 1 por personaje, repartidas durante el cuento, sin explicarlas):\n${frases.join('\n')}`
          );
        }

        // const relatos = this.seleccionarRelatos(d.relatos, q, 2, 340);
        // if (relatos.length) {
        //   partes.push(`RELATOS DE VIAJES:\n${relatos.join('\n')}`);
        // }

        return this.recortarContexto(partes, this.MAX_CHARS_CUENTO);
      })
    );
  }

  private construirContextoChat(pregunta: string): Observable<string> {
    const q = this.analizarConsulta(pregunta);
    const tiene = (...raices: string[]) => raices.some((r) => q.norm.includes(r));

    const cats = {
      viajes: tiene('viaj', 'vacacion', 'destino', 'fuimos', 'fueron', 'visit', 'hotel', 'airbnb', 'apartamento', 'estancia', 'escapada', 'excursion'),
      frases: tiene('frase', 'dijo', 'dice ', 'gracios', 'palabra', 'decia'),
      cumple: tiene('cumple', 'nacimiento', 'naci ', 'nacio', 'edad', 'anos tiene', 'cuantos anos', 'aniversari', 'cuando es', 'mayor', 'mas pequeno'),
      apodos: tiene('apodo', 'mote', 'aka', 'llaman', 'llamamos')
    };
    const general = !Object.values(cats).some(Boolean);

    return forkJoin({
      viajeros: this.leerJson('assets/data/viajeros.json'),
      personajes: this.leerJson('assets/data/personajes.json'),
      cumple: this.leerJson('assets/data/cumpleanyos.json'),
      frases: this.leerJson('assets/data/frases.json'),
      viajes: this.cargarIndiceViajes(),
    }).pipe(
      map((d) => {
        const personas = this.construirPersonas(d.viajeros, d.personajes, d.cumple);
        const mencionados = this.detectarPersonas(q, personas);
        const partes: string[] = [this.bloquePersonajes(personas, mencionados)];

        const extendida = this.bloqueExtendida(personas, mencionados);
        if (extendida) partes.push(extendida);

        if (cats.cumple || general) {
          const lista = this.aLista(d.cumple)
            .filter((c) => c?.['nombre'])
            .map((c) => `- ${c['nombre']}: ${c['dia']}/${c['mes']} (nació en ${c['anyoNacimiento']})`);
          if (lista.length) partes.push(`CUMPLEAÑOS:\n${lista.join('\n')}`);
        }

        if (cats.viajes || general || q.tokens.length > 0) {
          const max = cats.viajes ? 6 : 3;
          const viajes = this.seleccionarViajes(d.viajes, q, mencionados, max, general);
          if (viajes.length) {
            partes.push(`VIAJES:\n${viajes.map((v) => this.lineaViaje(v, cats.viajes ? 350 : 220)).join('\n')}`);
          }
        }

        if (cats.frases || general) {
          const frases = this.seleccionarFrases(d.frases, q, mencionados, cats.frases ? 10 : 3);
          if (frases.length) partes.push(`FRASES:\n${frases.join('\n')}`);
        }

        return this.recortarContexto(partes, this.MAX_CHARS_CHAT);
      })
    );
  }

  private recortarContexto(partes: string[], maxChars: number): string {
    const resultado: string[] = [];
    let total = 0;
    for (const parte of partes.filter(Boolean)) {
      const coste = parte.length + 2;
      if (total + coste > maxChars) {
        const resto = maxChars - total - 2;
        if (resto > 200) {
          resultado.push(`${parte.slice(0, resto)}…`);
        }
        break;
      }
      resultado.push(parte);
      total += coste;
    }
    return resultado.join('\n\n');
  }

  // ───────────── Análisis de la consulta ─────────────

  private analizarConsulta(texto: string): ConsultaAnalizada {
    const norm = this.normalizarTexto(texto);
    const lista = norm.split(/[^a-z0-9]+/).filter(Boolean);
    const crudas = new Set(lista);
    const palabras = new Set(lista.map((p) => this.singular(p)));
    const tokens = Array.from(
      new Set(lista.filter((p) => p.length >= 4 && !this.STOPWORDS.has(p)).map((p) => this.singular(p)))
    );
    const temas = this.temas.filter((t) => t.disparadores.some((d) => palabras.has(this.singular(d))));

    return { norm, crudas, palabras, relleno: ` ${lista.join(' ')} `, tokens, temas };
  }

  private singular(p: string): string {
    if (p.length > 4 && p.endsWith('es')) return p.slice(0, -2);
    if (p.length > 3 && p.endsWith('s')) return p.slice(0, -1);
    return p;
  }

  private coincideAlias(q: ConsultaAnalizada, alias: string): boolean {
    const a = this.normalizarTexto(alias)
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .join(' ');
    return a.length >= 3 && q.relleno.includes(` ${a} `);
  }

  private detectarPersonas(q: ConsultaAnalizada, personas: Persona[]): Set<string> {
    const ids = new Set<string>();

    for (const p of personas) {
      const alias = [p.nombre, ...p.aka];
      const partes = p.nombre.split(/\s+/);
      if (!p.nucleo && partes.length > 1) {
        alias.push(partes[partes.length - 1]);
      }
      if (alias.some((a) => this.coincideAlias(q, a))) {
        ids.add(p.id);
      }
    }

    for (const col of this.colectivos) {
      if (col.palabras.some((w) => q.crudas.has(w) || q.palabras.has(w))) {
        col.ids.forEach((id) => ids.add(id));
      }
    }

    return ids;
  }

  // ───────────── Personajes ─────────────

  private construirPersonas(viajeros: unknown, extras: unknown, cumple: unknown): Persona[] {
    const extraPorId = new Map<string, Dato>();
    for (const e of this.aLista(extras)) {
      const id = this.normalizarTexto(String(e?.['id'] ?? e?.['nombre'] ?? '')).trim();
      if (id) extraPorId.set(id, e);
    }

    const mapa = new Map<string, Persona>();

    const aplicarExtra = (p: Persona) => {
      const e = extraPorId.get(p.id);
      if (!e) return;
      p.rol = typeof e['rol'] === 'string' ? e['rol'] : p.rol;
      p.relaciones = typeof e['relaciones'] === 'string' ? e['relaciones'] : p.relaciones;
      p.rasgos = Array.isArray(e['rasgos']) ? e['rasgos'].map(String) : p.rasgos;
      p.detalles = Array.isArray(e['detalles']) ? e['detalles'].map(String) : p.detalles;
    };

    for (const v of this.aLista(viajeros)) {
      const nombre = String(v?.['nombre'] ?? '').trim();
      if (!nombre) continue;
      const id = this.normalizarTexto(nombre);
      const m = String(v?.['nacimiento'] ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
      const persona: Persona = {
        id,
        nombre,
        aka: Array.isArray(v?.['aka']) ? v['aka'].map(String) : [],
        nacimiento: m ? { y: +m[1], m: +m[2], d: +m[3] } : null,
        nucleo: true,
        rasgos: [],
        detalles: []
      };
      aplicarExtra(persona);
      mapa.set(id, persona);
    }

    for (const c of this.aLista(cumple)) {
      const nombre = String(c?.['nombre'] ?? '').trim();
      const id = this.normalizarTexto(String(c?.['id'] ?? nombre)).trim();
      if (!nombre || mapa.has(id)) continue;
      const persona: Persona = {
        id,
        nombre,
        aka: [],
        nacimiento: c?.['anyoNacimiento']
          ? { y: Number(c['anyoNacimiento']), m: Number(c['mes']), d: Number(c['dia']) }
          : null,
        nucleo: false,
        rasgos: [],
        detalles: []
      };
      aplicarExtra(persona);
      mapa.set(id, persona);
    }

    return Array.from(mapa.values());
  }

  private edadDe(p: Persona): number | null {
    if (!p.nacimiento) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - p.nacimiento.y;
    const m = p.nacimiento.m ?? 1;
    const d = p.nacimiento.d ?? 1;
    if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) {
      edad--;
    }
    return edad;
  }

  private textoEdad(p: Persona): string {
    const edad = this.edadDe(p);
    if (edad === null || edad >= 18) return '';
    if (edad < 1) return 'bebé';
    return `${edad} ${edad === 1 ? 'año' : 'años'}`;
  }

  private bloquePersonajes(personas: Persona[], mencionados: Set<string>): string {
    const nucleo = personas.filter((p) => p.nucleo);
    const protagonistas = nucleo.filter((p) => mencionados.has(p.id)).map((p) => p.nombre);

    const lineas = nucleo.map((p) => {
      const partes: string[] = [];
      const edad = this.textoEdad(p);
      partes.push(edad ? `${p.nombre} (${edad})` : p.nombre);
      if (p.rol) partes.push(p.rol);
      if (p.relaciones) partes.push(p.relaciones);

      const apodosValidos = p.aka.map((a) => String(a ?? '').trim()).filter(Boolean);
      if (apodosValidos.length > 0) {
        const ultimoApodo = this.ultimosApodosPorPersona.get(p.id);
        const candidatosApodo =
          apodosValidos.length > 1 && ultimoApodo
            ? apodosValidos.filter((a) => this.normalizarTexto(a) !== this.normalizarTexto(ultimoApodo))
            : apodosValidos;
        const apodoElegido = candidatosApodo[Math.floor(Math.random() * candidatosApodo.length)];
        this.ultimosApodosPorPersona.set(p.id, apodoElegido);
        partes.push(`Apodo opcional (usar máx. 1 vez): ${apodoElegido}`);
      }

      if (p.rasgos.length) partes.push(`Rasgos: ${p.rasgos.slice(0, 2).join('; ')}`);
      if (p.detalles.length) partes.push(`Detalles: ${p.detalles.slice(0, 2).join('; ')}`);
      return `- ${partes.join('. ')}.`;
    });

    const cabecera = protagonistas.length
      ? `PERSONAJES PRINCIPALES (protagonizan: ${protagonistas.join(', ')}):`
      : 'PERSONAJES PRINCIPALES (la familia):';

    return `${cabecera}\n${lineas.join('\n')}`;
  }

  private bloqueExtendida(personas: Persona[], mencionados: Set<string>): string {
    const lineas = personas
      .filter((p) => !p.nucleo && mencionados.has(p.id))
      .map((p) => {
        const edad = this.textoEdad(p);
        const extra = [edad, p.rol, p.relaciones].filter(Boolean).join('. ');
        return `- ${p.nombre}${extra ? ` (${extra})` : ''}`;
      });
    return lineas.length ? `OTROS FAMILIARES MENCIONADOS:\n${lineas.join('\n')}` : '';
  }

  // ───────────── Frases, líneas genéricas, relatos ─────────────

  private seleccionarFrases(
    frases: unknown,
    q: ConsultaAnalizada,
    mencionados: Set<string>,
    max: number
  ): string[] {
    const validas = this.aLista(frases).filter((f) => f?.['frase'] && !f['ocultoIa']);
    if (!validas.length) return [];

    const nombresNucleo = new Set(Array.from(mencionados));
    let candidatas = validas.filter((f) => nombresNucleo.has(this.normalizarTexto(String(f['persona'] ?? ''))));
    if (!candidatas.length) candidatas = validas;

    const recientes = new Set(this.ultimasFrasesUsadas);
    const sinRepetirRecientes = candidatas.filter(
      (f) => !recientes.has(this.normalizarTexto(String(f['frase'] ?? '')).trim())
    );
    const pool = sinRepetirRecientes.length > 0 ? sinRepetirRecientes : candidatas;

    const ordenadas = pool
      .map((f) => {
        const texto = this.normalizarTexto(`${f['frase']} ${f['explicacion'] ?? ''}`);
        const base = this.puntuarTexto(texto, q);
        const puntos = (base > 0 ? base : 1) + Math.random() * 8;
        return { f, puntos };
      })
      .sort((a, b) => b.puntos - a.puntos);

    const vistasPorPersona = new Set<string>();
    const seleccionadas: Dato[] = [];
    for (const item of ordenadas) {
      const personaKey = this.normalizarTexto(String(item.f['persona'] ?? '')).trim();
      if (personaKey && vistasPorPersona.has(personaKey)) {
        continue;
      }
      if (personaKey) {
        vistasPorPersona.add(personaKey);
      }
      seleccionadas.push(item.f);
      if (seleccionadas.length >= max) {
        break;
      }
    }

    const clavesElegidas = seleccionadas
      .map((f) => this.normalizarTexto(String(f['frase'] ?? '')).trim())
      .filter(Boolean);
    if (clavesElegidas.length > 0) {
      this.ultimasFrasesUsadas = Array.from(new Set([...clavesElegidas, ...this.ultimasFrasesUsadas])).slice(0, 12);
    }

    return seleccionadas.map((f) => {
      const explic = f['explicacion'] ? ` (= ${this.resumirTexto(f['explicacion'], 110)})` : '';
      return `- ${f['persona']}: «${this.resumirTexto(f['frase'], 130)}»${explic}`;
    });
  }

  private prepararTexto(texto: string): string {
    return ` ${this.normalizarTexto(texto).replace(/[^a-z0-9]+/g, ' ')} `;
  }

  private contienePalabra(textoPreparado: string, raiz: string): boolean {
    return textoPreparado.includes(` ${raiz}`);
  }

  private puntuarTexto(texto: string, q: ConsultaAnalizada): number {
    const preparado = this.prepararTexto(texto);
    let puntos = 0;
    for (const t of q.tokens) {
      if (this.contienePalabra(preparado, t)) puntos += 5;
    }
    return puntos;
  }

  private aLista(data: unknown): Dato[] {
    if (Array.isArray(data)) return data as Dato[];
    if (data && typeof data === 'object') {
      const obj = data as Dato;
      const anidada = obj['personajes'] ?? obj['items'] ?? obj['datos'];
      if (Array.isArray(anidada)) return anidada as Dato[];
    }
    return [];
  }

  private aLineas(data: unknown): string[] {
    if (data === null || data === undefined) return [];
    let items: unknown[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (typeof data === 'object') {
      items = Object.entries(data as Dato).map(([k, v]) => ({ [k]: v }));
    }
    return items
      .map((it) => (typeof it === 'string' ? it : JSON.stringify(it).replace(/[{}"[\]]/g, '')))
      .map((t) => t.trim())
      .filter(Boolean);
  }

  private seleccionarLineas(
    lineas: string[],
    q: ConsultaAnalizada,
    max: number,
    relleno: number,
    maxChars: number
  ): string[] {
    if (!lineas.length) return [];
    const puntuadas = lineas
      .map((l, i) => ({ l, i, p: this.puntuarTexto(this.normalizarTexto(l), q) }))
      .sort((a, b) => b.p - a.p || a.i - b.i);

    const positivas = puntuadas.filter((x) => x.p > 0).slice(0, max);
    const elegidas = positivas.length ? positivas : puntuadas.slice(0, relleno);
    return elegidas.map((x) => this.resumirTexto(x.l, maxChars));
  }

  // private seleccionarRelatos(relatos: RelatoIndexado[], q: ConsultaAnalizada, max: number, maxChars: number): string[] {
  //   const positivos = relatos
  //     .map((r) => ({ r, p: this.puntuarTexto(r.claves, q) + Math.random() }))
  //     .filter((x) => x.p > 0.5)
  //     .sort((a, b) => b.p - a.p)
  //     .slice(0, max);

  //   return positivos.map(({ r }) => `- ${r.archivo}: ${this.resumirTexto(r.texto, maxChars)}`);
  // }

  // ───────────── Viajes: índice, selección y formato ─────────────

  private leerJson(ruta: string): Observable<unknown> {
    let obs = this.cacheJson.get(ruta);
    if (!obs) {
      obs = this.http.get<unknown>(ruta).pipe(
        catchError(() => of(null)),
        map((data) => (data ? this.extraerSoloEs(data) : null)),
        shareReplay(1)
      );
      this.cacheJson.set(ruta, obs);
    }
    return obs;
  }

  private cargarIndiceViajes(): Observable<ViajeIndexado[]> {
    if (!this.indiceViajes$) {
      const guardado = this.leerIndiceGuardado();
      const origen$ = guardado
        ? of(guardado)
        : this.construirIndiceViajes().pipe(
            tap((indice) => {
              if (indice.length > 0) {
                this.guardarIndice(indice);
              } else {
                this.indiceViajes$ = undefined;
              }
            })
          );
      this.indiceViajes$ = origen$.pipe(shareReplay(1));
    }
    return this.indiceViajes$;
  }

  private construirIndiceViajes(): Observable<ViajeIndexado[]> {
    return this.listarJsonEnCarpeta(this.viajesRepoFolder).pipe(
      switchMap((archivos) => {
        if (archivos.length === 0) {
          return of([] as ViajeIndexado[]);
        }
        const ordenados = [...archivos].sort((a, b) => b.localeCompare(a)).slice(0, this.MAX_VIAJES_A_TRATAR);
        const peticiones = ordenados.map((archivo) =>
          this.http.get<unknown>(`${this.viajesAssetsFolder}/${archivo}`).pipe(
            catchError(() => of(null)),
            map((json) => (json ? this.indexarViaje(archivo, json) : null))
          )
        );
        return forkJoin(peticiones).pipe(
          map((items) => items.filter((i): i is ViajeIndexado => i !== null))
        );
      })
    );
  }

  private indexarViaje(archivo: string, bruto: unknown): ViajeIndexado | null {
    const limpio = this.extraerSoloEs(bruto);
    if (!limpio || typeof limpio !== 'object' || Array.isArray(limpio)) return null;

    const o = limpio as Dato;
    const meta = this.parsearFechaYDestinoDeNombre(archivo);
    const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
    const lista = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : []);

    const textos: string[] = [];
    const parrafos: string[] = [];
    for (const b of Array.isArray(o['bloques']) ? (o['bloques'] as Dato[]) : []) {
      if (b && typeof b['texto'] === 'string' && ['parrafo', 'cita', 'nota', 'titulo'].includes(b['tipo'])) {
        const t = b['texto'].trim();
        textos.push(t);
        if (b['tipo'] === 'parrafo') parrafos.push(t);
      }
    }

    const destino = str(o['destino']) || meta.destino;
    const personas = lista(o['personas']);
    const transporte = lista(o['transporte']).join(', ');
    const estancia = [str(o['estancia']), str(o['tipoEstancia']) ? `(${str(o['tipoEstancia'])})` : '']
      .filter(Boolean)
      .join(' ');

    const narracionCompleta = parrafos.join(' ').trim();
    const claves = this.normalizarTexto(
      [destino, str(o['categoria']), str(o['provincia']), str(o['pais']), estancia, transporte, personas.join(' '), str(o['anyo']), textos.join(' ')].join(' ')
    ).slice(0, 2800);

    return {
      archivo,
      anyo: str(o['anyo']) || meta.fecha.slice(0, 4),
      destino,
      categoria: str(o['categoria']),
      provincia: str(o['provincia']),
      pais: str(o['pais']),
      estancia,
      transporte,
      personas,
      foto: this.extraerPrimeraFotoDeViaje(o),
      resumen: narracionCompleta,
      claves
    };
  }

  private seleccionarViajes(
    indice: ViajeIndexado[],
    q: ConsultaAnalizada,
    mencionados: Set<string>,
    max: number,
    rellenarSiVacio: boolean
  ): ViajeIndexado[] {
    if (!indice.length) return [];

    const puntuados = indice.map((v, i) => {
      let p = this.puntuarTexto(v.claves, q);
      const claves = this.prepararTexto(v.claves);
      const destinoNorm = this.normalizarTexto(v.destino);

      if (destinoNorm && q.norm.includes(destinoNorm)) {
        p += 8;
      }

      for (const tema of q.temas) {
        if (tema.afines.some((a) => this.contienePalabra(claves, a))) p += 5;
        if (tema.opuestos?.some((o) => this.contienePalabra(claves, o))) p -= 6;
      }
      const personasNorm = this.normalizarTexto(v.personas.join(' '));
      for (const id of mencionados) {
        if (personasNorm.includes(id)) p += 2;
      }
      return { v, p, i };
    });

    const positivos = puntuados.filter((x) => x.p > 0);

    if (max === 1) {
      const pool = positivos.length > 0 ? positivos : puntuados;
      if (!pool.length) return [];

      if (positivos.length > 0) {
        const mejorPuntaje = Math.max(...positivos.map((x) => x.p));
        const umbral = Math.max(1, mejorPuntaje - 4);
        const afines = positivos.filter((x) => x.p >= umbral);
        const candidatosBase = afines.length > 0 ? afines : positivos;
        const sinUltimo =
          candidatosBase.length > 1 && this.ultimoViajeUsadoArchivo
            ? candidatosBase.filter((x) => x.v.archivo !== this.ultimoViajeUsadoArchivo)
            : candidatosBase;
        const candidatos = sinUltimo.length > 0 ? sinUltimo : candidatosBase;
        const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
        this.ultimoViajeUsadoArchivo = elegido.v.archivo;
        return [elegido.v];
      }

      if (!rellenarSiVacio) {
        return [];
      }

      const conResumen = pool.filter((x) => x.v.resumen && x.v.resumen.trim().length > 40);
      const base = conResumen.length > 0 ? conResumen : pool;
      const sinUltimoBase =
        base.length > 1 && this.ultimoViajeUsadoArchivo
          ? base.filter((x) => x.v.archivo !== this.ultimoViajeUsadoArchivo)
          : base;
      const candidatosRespaldo = sinUltimoBase.length > 0 ? sinUltimoBase : base;
      const elegido = candidatosRespaldo[Math.floor(Math.random() * candidatosRespaldo.length)];
      this.ultimoViajeUsadoArchivo = elegido.v.archivo;
      return [elegido.v];
    }

    const ordenados = positivos
      .map((x) => ({ ...x, azar: Math.random() * 1.5 }))
      .sort((a, b) => b.p + b.azar - (a.p + a.azar))
      .slice(0, max)
      .map((x) => x.v);

    if (ordenados.length > 0 || !rellenarSiVacio) {
      return ordenados;
    }

    const conResumen = indice.filter((v) => v.resumen && v.resumen.trim().length > 40);
    const base = conResumen.length > 0 ? conResumen : indice;
    const inicio = Math.floor(Math.random() * base.length);
    return [base[inicio]];
  }

  private lineaViaje(v: ViajeIndexado, maxResumen?: number): string {
    const lugar = [v.destino, v.provincia && v.provincia !== v.destino ? v.provincia : '', v.pais]
      .filter(Boolean)
      .join(', ');
    const meta = [v.categoria, v.estancia, v.transporte].filter(Boolean).join(' / ');
    const con = v.personas.length ? ` Con: ${v.personas.join(', ')}.` : '';
    const textoNarracion =
      typeof maxResumen === 'number' ? this.resumirTexto(v.resumen, maxResumen) : v.resumen;
    const resumen = textoNarracion ? ` Narración completa: ${textoNarracion}` : '';
    return `- ${v.anyo} · ${lugar}${meta ? ` [${meta}]` : ''}.${con}${resumen}`;
  }

  private leerIndiceGuardado(): ViajeIndexado[] | null {
    try {
      const crudo = localStorage.getItem(this.storageIndice);
      if (!crudo) return null;
      const g = JSON.parse(crudo) as IndiceGuardado;
      if (g.version !== this.versionIndice || Date.now() - g.creado > this.ttlIndiceMs || !g.viajes?.length) {
        return null;
      }
      return g.viajes.map((v) => ({
        ...v,
        foto: this.normalizarRutaAsset(v.foto)
      }));
    } catch {
      return null;
    }
  }

  private guardarIndice(viajes: ViajeIndexado[]): void {
    try {
      const g: IndiceGuardado = { version: this.versionIndice, creado: Date.now(), viajes };
      localStorage.setItem(this.storageIndice, JSON.stringify(g));
    } catch {
      /* cuota de localStorage llena */
    }
  }

  private cargarRelatos(): Observable<RelatoIndexado[]> {
    if (!this.relatos$) {
      this.relatos$ = this.listarJsonEnCarpeta(this.relatosRepoFolder).pipe(
        switchMap((archivos) => {
          if (archivos.length === 0) {
            return of([] as Array<RelatoIndexado | null>);
          }
          return forkJoin(
            archivos.map((archivo) =>
              this.http.get<unknown>(`${this.relatosAssetsFolder}/${archivo}`).pipe(
                catchError(() => of(null)),
                map((json) => (json ? this.indexarRelato(archivo, json) : null))
              )
            )
          );
        }),
        map((items) => items.filter((i): i is RelatoIndexado => i !== null)),
        shareReplay(1)
      );
    }
    return this.relatos$;
  }

  private indexarRelato(archivo: string, json: unknown): RelatoIndexado {
    const contenido = this.extraerDescripcionesEs(json) ?? this.extraerSoloEs(json);
    const texto = this.resumirTexto(contenido, 1500);
    return {
      archivo: archivo.replace(/\.json$/i, ''),
      texto,
      claves: this.normalizarTexto(`${archivo} ${texto}`)
    };
  }

  private listarJsonEnCarpeta(repoFolder: string): Observable<string[]> {
    const cacheado = this.cacheCarpetasGithub.get(repoFolder);
    if (cacheado && cacheado.length > 0) {
      return of(cacheado);
    }

    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${repoFolder}?ref=${this.repoBranch}`;
    const githubToken = (
      localStorage.getItem('gh_travel_token') ||
      localStorage.getItem('github_token') ||
      localStorage.getItem('token') ||
      ''
    ).trim();
    const opcionesHttp = githubToken ? { headers: { Authorization: `Bearer ${githubToken}` } } : {};

    return this.http.get<GithubDirItem[]>(apiUrl, opcionesHttp).pipe(
      map((items) => {
        const archivos = (Array.isArray(items) ? items : [])
          .filter((item) => item.type === 'file' && item.name.toLowerCase().endsWith('.json'))
          .map((item) => item.name);
        if (archivos.length > 0) {
          this.cacheCarpetasGithub.set(repoFolder, archivos);
        }
        return archivos;
      }),
      catchError(() => of(cacheado ?? ([] as string[])))
    );
  }

  private parsearFechaYDestinoDeNombre(nombreArchivo: string): { fecha: string; destino: string } {
    const sinExt = nombreArchivo.replace(/\.json$/i, '');
    const match = sinExt.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    if (!match) {
      return { fecha: '', destino: sinExt.replace(/-/g, ' ') };
    }
    return { fecha: match[1], destino: match[2].replace(/-/g, ' ') };
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
        const es = this.extraerSoloEs(valor);
        if (es !== null && es !== undefined && es !== '') {
          resultados[clave] = es;
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

  private extraerSoloEs(nodo: unknown): unknown {
    if (nodo === null || nodo === undefined) {
      return null;
    }

    if (typeof nodo === 'string' || typeof nodo === 'number' || typeof nodo === 'boolean') {
      return nodo;
    }

    if (Array.isArray(nodo)) {
      return nodo
        .map((item) => this.extraerSoloEs(item))
        .filter((item) => item !== null && item !== undefined && item !== '');
    }

    const obj = nodo as Record<string, unknown>;
    const claves = Object.keys(obj);
    const clavesLower = claves.map((k) => k.toLowerCase());

    const claveEs = claves.find((k) => k.toLowerCase() === 'es');
    const tieneOtrosIdiomas = clavesLower.some((k) => k === 'val' || k === 'ca' || k === 'en' || k === 'fr');

    if (claveEs && (tieneOtrosIdiomas || claves.length <= 3)) {
      return this.extraerSoloEs(obj[claveEs]);
    }

    const resultado: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(obj)) {
      const cLower = clave.toLowerCase();
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
    if (texto.length <= maxChars) {
      return texto;
    }
    const corte = texto.slice(0, maxChars);
    const ultimoEspacio = corte.lastIndexOf(' ');
    return `${ultimoEspacio > maxChars - 25 ? corte.slice(0, ultimoEspacio) : corte}...`;
  }

  private fechaHoy(): string {
    return new Date().toLocaleDateString('sv-SE');
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // ═════════════════════════════════════════════════════════
  //  ILUSTRACIONES: POLLINATIONS → HF → CLOUDFLARE → PUTER → COLLAGE
  // ═════════════════════════════════════════════════════════

  generarIlustracionCuentoConReferencias(
    promptCuento: string,
    textoCuento: string,
    estiloVisual?: string
  ): Observable<string | null> {
    const q = this.analizarConsulta(`${promptCuento} ${textoCuento}`);
    const promptIlustracion = this.construirPromptIlustracion(promptCuento, textoCuento);
    const guiaEstilo = this.resolverGuiaEstilo(estiloVisual);

    return forkJoin({
      viajeros: this.leerJson('assets/data/viajeros.json'),
      personajes: this.leerJson('assets/data/personajes.json'),
      cumple: this.leerJson('assets/data/cumpleanyos.json'),
      viajes: this.cargarIndiceViajes()
    }).pipe(
      switchMap((d) => {
        const personas = this.construirPersonas(d.viajeros, d.personajes, d.cumple);
        const mencionados = this.detectarPersonas(q, personas);
        const descripcionPersonajes = this.resumenVisualPersonajes(personas, mencionados);
        const viajesAfin = this.seleccionarViajes(d.viajes, q, mencionados, 2, false);
        const contextoEscenario = viajesAfin
          .map((v) => `${v.destino}${v.pais ? ` (${v.pais})` : ''}`)
          .join(', ');

        const promptFinal = [
          promptIlustracion,
          descripcionPersonajes ? `Personajes: ${descripcionPersonajes}.` : '',
          contextoEscenario ? `Lugar de inspiración: ${contextoEscenario}.` : '',
          guiaEstilo
        ]
          .filter(Boolean)
          .join(' ');

          return this.intentarPollinationsImagen(promptFinal).pipe(
            switchMap((imgPoll) => {
              if (imgPoll) {
                return of(imgPoll);
              }
              return this.intentarHuggingFaceImagen(promptFinal).pipe(
              switchMap((imgHf) => {
                if (imgHf) {
                  return of(imgHf);
                }
                return this.intentarCloudflareImagen(promptFinal).pipe(
                  switchMap((imgCloudflare) => {
                    if (imgCloudflare) {
                      return of(imgCloudflare);
                    }
                    return this.intentarPuterImagen(promptFinal).pipe(
                      switchMap((imgPuter) => {
                        if (imgPuter) {
                          return of(imgPuter);
                        }
                        return this.crearCollageDesdePrompt(promptCuento);
                      })
                    );
                  })
                );
              })
            );
          })
        );
      }),
      catchError(() => this.crearCollageDesdePrompt(promptCuento))
    );
  }

  /**
   * Solicita ilustraciones de forma continua hasta completar `cantidad` (por defecto 3).
   * La 1.ª imagen arranca sin esperar al cuerpo del cuento; la 2.ª y 3.ª usan tramos distintos
   * cuando están disponibles, manteniendo el mismo estilo del cuento en todas.
   */
  generarIlustracionesProgresivas(
    promptCuento: string,
    tramosEscena: [string, string, string] | (() => [string, string, string]),
    cantidad = 3,
    pausaEntreExitosMs = 2500,
    estiloVisual?: string
  ): Observable<{ url: string; proveedor: string }> {
    const enfoquesVisuales = [
      'Plano general de apertura y presentación del escenario y los personajes',
      'Plano medio dinámico de acción, exploración o giro divertido a mitad de la historia',
      'Encuadre luminoso y emotivo del desenlace y alegría final compartida'
    ];
    const maxIntentosTotales = cantidad * 3;
    const guiaEstilo = this.resolverGuiaEstilo(estiloVisual);

    return defer(() => {
      let conseguidas = 0;
      let intentos = 0;

      const siguientePaso$ = (): Observable<{ url: string; proveedor: string } | null> => {
        if (conseguidas >= cantidad || intentos >= maxIntentosTotales) {
          return of(null);
        }

        const slotEscena = Math.min(2, conseguidas);
        const tramos = typeof tramosEscena === 'function' ? tramosEscena() : tramosEscena;

        const detalleTramo =
          slotEscena === 0
            ? promptCuento
            : (tramos[slotEscena] || promptCuento);

        const escena = `${enfoquesVisuales[slotEscena]}. Idea: ${promptCuento}. Momento: ${detalleTramo}`;
        intentos++;
        this.ultimoProveedorUsado = '';

        return this.generarIlustracionCuentoConReferencias(promptCuento, escena, guiaEstilo).pipe(
          map((url) => {
            if (!url) {
              return null;
            }
            conseguidas++;
            return {
              url,
              proveedor: this.ultimoProveedorUsado || 'IA'
            };
          }),
          catchError(() => of(null))
        );
      };

      const pasoConEmision = (): Observable<{ url: string; proveedor: string }> => {
        return siguientePaso$().pipe(
          switchMap((resultado) => {
            if (conseguidas >= cantidad || intentos >= maxIntentosTotales) {
              return resultado ? of(resultado) : of();
            }

            const espera = resultado ? pausaEntreExitosMs : 4000;
            if (resultado) {
              return new Observable<{ url: string; proveedor: string }>((observer) => {
                observer.next(resultado);
                const sub = timer(espera)
                  .pipe(switchMap(() => pasoConEmision()))
                  .subscribe({
                    next: (v) => observer.next(v),
                    error: (e) => observer.error(e),
                    complete: () => observer.complete()
                  });
                return () => sub.unsubscribe();
              });
            }

            return timer(espera).pipe(switchMap(() => pasoConEmision()));
          })
        );
      };

      return pasoConEmision();
    });
  }

  private intentarHuggingFaceImagen(prompt: string): Observable<string | null> {
    const token = this.obtenerTokenHuggingFaceImagen();
    if (!token || this.modelosImagenHuggingFace.length === 0) {
      return of(null);
    }

    const modelosLibres = this.modelosImagenHuggingFace.filter((m) => {
      const exp = this.enfriamiento.get(`hf-img:${m}`) ?? 0;
      return exp <= Date.now();
    });
    const candidatos = modelosLibres.length > 0 ? modelosLibres : this.modelosImagenHuggingFace;

    const probarModelo = (idx: number): Observable<string | null> => {
      if (idx >= candidatos.length) {
        return of(null);
      }
      const modelo = candidatos[idx];
      const url = `https://router.huggingface.co/hf-inference/models/${modelo}`;

      return this.http
        .post(
          url,
          { inputs: this.resumirTexto(prompt, 900) },
          {
            headers: new HttpHeaders({
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }),
            responseType: 'blob'
          }
        )
        .pipe(
          timeout(this.timeoutHuggingFaceImagenMs),
          switchMap((blob) => {
            if (!blob || blob.size === 0) {
              return of(null);
            }
            return from(this.blobADataUrl(blob));
          }),
          tap((dataUrl) => {
            if (dataUrl) {
              this.ultimoProveedorUsado = `Hugging Face · ${modelo}`;
            }
          }),
          catchError((err) => {
            const info = this.clasificarError(err);
            this.enfriamiento.set(`hf-img:${modelo}`, Date.now() + info.esperaMs);
            console.warn(`[IA Imagen] Hugging Face (${modelo}) falló (${info.codigo}). Probando siguiente…`);
            return probarModelo(idx + 1);
          })
        );
    };

    return probarModelo(0);
  }

  private intentarPollinationsImagen(prompt: string): Observable<string | null> {
    if ((this.enfriamiento.get('poll-img') ?? 0) > Date.now()) {
      return of(null);
    }

    const apiKey = this.obtenerApiKeyPollinationsImagen();
    const promptCorto = this.resumirTexto(prompt, 500);
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(
      promptCorto
    )}?model=flux&width=1024&height=1024`;

    const opcionesHttp: { headers?: HttpHeaders; responseType: 'blob' } = {
      responseType: 'blob'
    };
    if (apiKey) {
      opcionesHttp.headers = new HttpHeaders({
        Authorization: `Bearer ${apiKey}`
      });
    }

    return this.http.get(url, opcionesHttp).pipe(
      timeout(this.timeoutPollinationsImagenMs),
      switchMap((blob) => {
        if (!blob || blob.size === 0) {
          return of(null);
        }
        return from(this.blobADataUrl(blob));
      }),
      tap((dataUrl) => {
        if (dataUrl) {
          this.ultimoProveedorUsado = 'Pollinations.ai · flux';
        }
      }),
      catchError((err) => {
        const info = this.clasificarError(err);
        this.enfriamiento.set('poll-img', Date.now() + Math.max(info.esperaMs, 30000));
        console.warn(`[IA Imagen] Pollinations.ai falló (${info.codigo}).`, err);
        return of(null);
      })
    );
  }

  private blobADataUrl(blob: Blob): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  private intentarCloudflareImagen(prompt: string): Observable<string | null> {
    const config = this.obtenerConfigCloudflareImagen();
    if (!config) {
      return of(null);
    }

    const modelosLibres = this.modelosImagenCloudflare.filter((m) => {
      const exp = this.enfriamiento.get(`cf-img:${m}`) ?? 0;
      return exp <= Date.now();
    });
    const candidatos = modelosLibres.length > 0 ? modelosLibres : this.modelosImagenCloudflare;

    const probarModelo = (idx: number): Observable<string | null> => {
      if (idx >= candidatos.length) {
        return of(null);
      }
      const modelo = candidatos[idx];
      return this.llamarCloudflareImagen(config, modelo, prompt).pipe(
        tap(() => {
          this.ultimoProveedorUsado = `Cloudflare · ${modelo}`;
        }),
        catchError((err) => {
          const info = this.clasificarError(err);
          this.enfriamiento.set(`cf-img:${modelo}`, Date.now() + info.esperaMs);
          console.warn(`[IA Imagen] Cloudflare (${modelo}) falló (${info.codigo}). Probando siguiente…`);
          return probarModelo(idx + 1);
        })
      );
    };

    return probarModelo(0);
  }

  private llamarCloudflareImagen(
    config: ConfigCloudflareImagen,
    modelo: string,
    prompt: string
  ): Observable<string | null> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
      config.accountId
    )}/ai/run/${modelo}`;

    return this.http
      .post<any>(
        url,
        {
          prompt: this.resumirTexto(prompt, 1400),
          width: 1024,
          height: 1024
        },
        {
          headers: new HttpHeaders({
            Authorization: `Bearer ${config.apiToken}`,
            'Content-Type': 'application/json'
          })
        }
      )
      .pipe(
        timeout(this.timeoutCloudflareImagenMs),
        map((resp) => {
          const base64 = resp?.result?.image ?? resp?.image;
          if (typeof base64 === 'string' && base64.trim()) {
            const limpia = base64.trim();
            return limpia.startsWith('data:') ? limpia : `data:image/png;base64,${limpia}`;
          }
          return null;
        })
      );
  }

  private intentarPuterImagen(prompt: string): Observable<string | null> {
    if ((this.enfriamiento.get('puter-img') ?? 0) > Date.now()) {
      return of(null);
    }

    return defer(() => from(this.cargarPuter())).pipe(
      switchMap((puter) => from(this.probarModelosPuter(puter, this.resumirTexto(prompt, 1200), 0))),
      timeout(45000),
      tap(() => {
        this.ultimoProveedorUsado = 'Puter';
      }),
      catchError((err) => {
        this.enfriamiento.set('puter-img', Date.now() + 60000);
        console.warn('[IA Imagen] Puter no disponible, pasando a collage.', err);
        return of(null);
      })
    );
  }

  generarIlustracionPuter(titulo: string, escena: string, estiloVisual?: string): Observable<string> {
    const prompt = [
      this.resolverGuiaEstilo(estiloVisual),
      `Cuento: ${titulo}.`,
      `Escena: ${this.resumirTexto(escena, 450)}`
    ].join(' ');

    return defer(() => from(this.cargarPuter())).pipe(
      switchMap((puter) => from(this.probarModelosPuter(puter, prompt, 0))),
      timeout(120000)
    );
  }

  private construirPromptIlustracion(promptCuento: string, textoCuento: string): string {
    const bloques = (textoCuento || '')
      .split(/\n\s*\n/)
      .map((b) => b.replace(/^#+\s*|\*\*/g, '').trim())
      .filter(Boolean);

    const titulo = bloques[0] && bloques[0].length < 95 && !bloques[0].endsWith('.') ? bloques[0] : '';
    const cuerpo = titulo ? bloques.slice(1).join(' ') : bloques.join(' ');
    const extracto = this.resumirTexto(cuerpo.replace(/\s+/g, ' ').trim(), 420);

    return [
      promptCuento ? `Idea: ${promptCuento}.` : '',
      titulo ? `Título: ${titulo}.` : '',
      extracto ? `Escena del cuento: ${extracto}.` : ''
    ]
      .filter(Boolean)
      .join(' ');
  }

  private resumenVisualPersonajes(personas: Persona[], mencionados: Set<string>): string {
    const nucleo = personas.filter((p) => p.nucleo);
    const seleccionados =
      mencionados.size > 0 ? nucleo.filter((p) => mencionados.has(p.id)) : nucleo.slice(0, 4);

    return seleccionados
      .map((p) => {
        const edad = this.textoEdad(p);
        const rasgos = p.rasgos.slice(0, 2).join(', ');
        return [p.nombre, edad, rasgos].filter(Boolean).join(' - ');
      })
      .join('; ');
  }

  private cargarPuter(): Promise<any> {
    const w = window as any;
    if (w.puter) {
      return Promise.resolve(w.puter);
    }
    if (!this.puterPromesa) {
      this.puterPromesa = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.puter.com/v2/';
        script.async = true;
        script.onload = () => (w.puter ? resolve(w.puter) : reject(new Error('Puter no disponible')));
        script.onerror = () => {
          this.puterPromesa = undefined;
          reject(new Error('No se pudo cargar Puter.js'));
        };
        document.head.appendChild(script);
      });
    }
    return this.puterPromesa;
  }

  private async probarModelosPuter(puter: any, prompt: string, indice: number): Promise<string> {
    const cfg = this.modelosImagenPuter[indice];
    try {
      const opciones = cfg?.model
        ? { model: cfg.model, ...(cfg.quality ? { quality: cfg.quality } : {}) }
        : undefined;
      const img: HTMLImageElement = await puter.ai.txt2img(prompt, opciones);
      const src = img?.src;
      if (!src) {
        throw new Error('Puter no devolvió ninguna imagen.');
      }
      return await this.aDataUrl(src);
    } catch (err) {
      const msg = String((err as any)?.error?.message ?? (err as any)?.message ?? '').toLowerCase();
      const status = (err as any)?.status ?? (err as any)?.error?.status;
      const esLimiteOPlan =
        status === 402 ||
        status === 429 ||
        /upgrade|plan|limit|quota|rate|insufficient|credit/i.test(msg);

      if (esLimiteOPlan) {
        this.enfriamiento.set('puter-img', Date.now() + 5 * 60 * 1000);
        throw err instanceof Error ? err : new Error(msg || 'Límite de plan en Puter');
      }

      if (indice + 1 < this.modelosImagenPuter.length) {
        return this.probarModelosPuter(puter, prompt, indice + 1);
      }
      throw err instanceof Error ? err : new Error(String((err as any)?.error?.message ?? 'Error de Puter'));
    }
  }

  private async aDataUrl(src: string): Promise<string> {
    if (src.startsWith('data:')) return src;
    try {
      const blob = await (await fetch(src)).blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  }

  // ───────────── Collage con fotos reales (gratis, instantáneo) ─────────────

  private buscarFotosPerfilesPorPrompt(q: ConsultaAnalizada): Observable<string[]> {
    return this.leerJson('assets/data/viajeros.json').pipe(
      map((viajeros) => {
        const fotos: string[] = [];
        for (const v of this.aLista(viajeros)) {
          const nombres = [v['nombre'], v['nombreCompleto'], ...(Array.isArray(v['aka']) ? v['aka'] : [])]
            .filter(Boolean)
            .map(String);
          const coincide = nombres.some((n) => this.coincideAlias(q, n));
          if (coincide && typeof v['fotoPerfil'] === 'string' && v['fotoPerfil'].trim()) {
            fotos.push(this.normalizarRutaAsset(v['fotoPerfil'].trim()));
          }
        }
        return Array.from(new Set(fotos));
      })
    );
  }

  private buscarFotosViajesPorPrompt(q: ConsultaAnalizada): Observable<string[]> {
    return this.cargarIndiceViajes().pipe(
      map((indice) =>
        this.seleccionarViajes(indice, q, new Set<string>(), 4, true)
          .map((v) => this.normalizarRutaAsset(v.foto))
          .filter(Boolean)
      )
    );
  }

  private extraerPrimeraFotoDeViaje(jsonViaje: any): string {
    const candidatosDirectos = [jsonViaje?.foto, jsonViaje?.imagen, jsonViaje?.portada, jsonViaje?.fotoPortada];

    for (const c of candidatosDirectos) {
      if (typeof c === 'string' && c.trim()) {
        return this.normalizarRutaAsset(c.trim());
      }
    }

    for (const arr of [jsonViaje?.fotos, jsonViaje?.imagenes, jsonViaje?.galeria]) {
      if (Array.isArray(arr) && arr.length > 0) {
        const primero = arr[0];
        if (typeof primero === 'string' && primero.trim()) {
          return this.normalizarRutaAsset(primero.trim());
        }
        if (primero && typeof primero === 'object') {
          const campo = primero.src || primero.url || primero.ruta || primero.imagen || primero.foto;
          if (typeof campo === 'string' && campo.trim()) {
            return this.normalizarRutaAsset(campo.trim());
          }
        }
      }
    }

    return '';
  }

  private normalizarRutaAsset(ruta: string): string {
    const limpia = (ruta || '').trim().replace(/^\/+/, '');
    if (!limpia) {
      return '';
    }
    if (limpia.startsWith('http') || limpia.startsWith('assets/')) {
      return limpia;
    }
    if (limpia.startsWith('images/')) {
      return `assets/${limpia}`;
    }
    return `assets/images/${limpia}`;
  }

  crearCollageDesdePrompt(promptCuento: string): Observable<string | null> {
    const q = this.analizarConsulta(promptCuento);

    return forkJoin({
      fotosPerfiles: this.buscarFotosPerfilesPorPrompt(q),
      fotosViajes: this.buscarFotosViajesPorPrompt(q)
    }).pipe(
      switchMap(({ fotosPerfiles, fotosViajes }) => {
        const rutas = Array.from(new Set([...fotosPerfiles, ...fotosViajes]))
          .filter(Boolean)
          .slice(0, 4);

        if (rutas.length === 0) {
          return of(null);
        }

        const cargas = rutas.map((ruta) => this.cargarImagenHtml(ruta).pipe(catchError(() => of(null))));

        return forkJoin(cargas).pipe(
          map((imgs) => {
            const validas = imgs.filter((img): img is HTMLImageElement => Boolean(img));
            return validas.length === 0 ? null : this.dibujarCollageEnCanvas(validas);
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
      celdas.push({ x: padding, y: padding, w: ancho - padding * 2, h: alto - padding * 2 });
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
      celdas.push({ x: padding + izquierdaW + gap, y: padding + derechaH + gap, w: derechaW, h: derechaH });
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
