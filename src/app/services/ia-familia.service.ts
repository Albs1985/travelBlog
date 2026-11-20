import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, defer, forkJoin, from, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap, timeout } from 'rxjs/operators';
import { GoogleGenAI } from '@google/genai';

export interface OpcionesCuento {
  protagonistas?: string;
  lugar?: string;
  tono?: string;
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

@Injectable({
  providedIn: 'root'
})
export class IaFamiliaService {
  // ───────────────────────── Claves ─────────────────────────
  // storageKey es la clave "histórica" (la que usa el toolbar). Ahora admite VARIAS claves
  // separadas por coma, espacio o salto de línea: "gsk_xxx, AIzaxxx". El proveedor se detecta
  // por el prefijo (gsk_ = Groq; el resto = Gemini).
  private readonly storageKey = 'gemini_familia_api_key';
  private readonly storageKeyGroq = 'groq_familia_api_key';
  private readonly storageKeyImagen = 'imagen_familia_api_key';

  // ───────────────────────── Proveedores y modelos ─────────────────────────
  // Orden de intento: primero Groq (rápido), después Gemini como respaldo.
  // Cada modelo de Groq tiene su propia cuota, así que encadenarlos multiplica el margen.
  // Revisa los IDs vigentes en https://console.groq.com/docs/models
  private readonly ordenProveedores: ProveedorIa[] = ['groq', 'gemini'];
  private readonly modelosGroq = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile'
  ];
  private readonly modelosGemini = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
  private readonly modelosImagenGemini = [
    'gemini-2.5-flash-image',
    'gemini-3.1-flash-lite-image'
  ];

  private readonly timeoutGroqMs = 20000;
  private readonly timeoutGeminiMs = 25000;

  // Modelos de imagen de Puter (se prueban en orden; el último, undefined, usa el modelo por defecto)
  // Catálogo: https://developer.puter.com/ai/
  private readonly modelosImagenPuter: Array<{ model?: string; quality?: 'low' | 'medium' | 'high' }> = [
    { model: 'openai/gpt-image-2.6-flare', quality: 'low' },
    { model: 'google/gemini-3.1-flash-lite-image' },
    {} // modelo por defecto de Puter
  ];

  /** Para mostrar en la UI quién ha respondido (p. ej. "Groq · openai/gpt-oss-120b"). */
  ultimoProveedorUsado = '';

  // modelos "en espera" tras un 429/503, para no volver a perder tiempo con ellos
  private readonly enfriamiento = new Map<string, number>();

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

  // Índice de viajes cacheado en localStorage para no releer toda la carpeta en cada visita
  private readonly storageIndice = 'ia_indice_viajes';
  private readonly versionIndice = 1;
  private readonly ttlIndiceMs = 12 * 3600 * 1000;

  // Presupuesto de contexto (caracteres). ~4 caracteres ≈ 1 token.
  // Groq gratis: 8.000 tokens/minuto por modelo → mantenemos el prompt en ~1.500-2.000 tokens.
  private readonly MAX_CHARS_CUENTO = 4500;
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

  // Palabras genéricas que remiten a varios personajes a la vez
  private readonly colectivos: Array<{ palabras: string[]; ids: string[] }> = [
    { palabras: ['nino', 'nina', 'hijo', 'hija', 'peque', 'pequeno', 'hermano', 'hermana', 'xiquet', 'xiqueta', 'crio', 'nen', 'nena', 'ninos', 'hijos', 'hermanos'], ids: ['mateu', 'marina'] },
    { palabras: ['padres', 'papas', 'papis', 'papa', 'mama', 'pare', 'mare', 'padre', 'madre', 'papi', 'mami'], ids: ['albert', 'alba'] },
    { palabras: ['familia', 'todos', 'todas'], ids: ['mateu', 'marina', 'alba', 'albert'] },
    { palabras: ['abuelo', 'abuela', 'abuelos', 'abuelas', 'iaio', 'iaia', 'iaios', 'iaies', 'avi', 'avia', 'avis'], ids: ['pepe', 'ana', 'pep', 'matilde'] }
  ];

  constructor(private http: HttpClient) {}

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
  //  API PÚBLICA
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
          'Mantén los nombres, apodos y rasgos de los personajes tal como aparecen en los datos.',
          'Los datos de la familia son inspiración: integra con naturalidad uno o dos detalles (un lugar, una anécdota, una palabra o frase graciosa de los niños) sin listarlos ni explicarlos.',
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
          'DATOS DE LA FAMILIA (seleccionados según la temática):',
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

  /** Borra el índice de viajes cacheado (úsalo tras añadir viajes nuevos). */
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
  }

  // ═════════════════════════════════════════════════════════
  //  ORQUESTACIÓN DE PROVEEDORES (Groq → Gemini)
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

    // Los modelos gpt-oss "razonan": con esfuerzo bajo gastan menos tokens (y cuota) antes de escribir
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
      // apodos: this.leerJson('assets/data/apodos.json'),
      viajes: this.cargarIndiceViajes(),
      relatos: this.cargarRelatos()
    }).pipe(
      map((d) => {
        const personas = this.construirPersonas(d.viajeros, d.personajes, d.cumple);
        const mencionados = this.detectarPersonas(q, personas);
        const partes: string[] = [];

        // A) SIEMPRE: los cuatro personajes principales
        partes.push(this.bloquePersonajes(personas, mencionados));

        // Familia extendida, solo si se menciona
        const extendida = this.bloqueExtendida(personas, mencionados);
        if (extendida) partes.push(extendida);

        // B) VARIABLE: viajes, frases, relatos según la temática
        const viajes = this.seleccionarViajes(d.viajes, q, mencionados, 3, false);
        if (viajes.length) {
          partes.push(`VIAJES RELACIONADOS CON LA TEMÁTICA:\n${viajes.map((v) => this.lineaViaje(v, 330)).join('\n')}`);
        }

        const frases = this.seleccionarFrases(d.frases, q, mencionados, 4);
        if (frases.length) {
          partes.push(`FRASES Y PALABRAS GRACIOSAS (úsalas con gracia, sin explicarlas):\n${frases.join('\n')}`);
        }

        const relatos = this.seleccionarRelatos(d.relatos, q, 2, 320);
        if (relatos.length) {
          partes.push(`RELATOS FAMILIARES:\n${relatos.join('\n')}`);
        }

        // const apodos = this.seleccionarLineas(this.aLineas(d.apodos), q, 4, 0, 140);
        // if (apodos.length) {
        //   partes.push(`OTROS APODOS:\n${apodos.map((l) => `- ${l}`).join('\n')}`);
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
      recetas: tiene('receta', 'cocin', 'plato', 'ingrediente', 'comida', 'cena', 'postre'),
      apodos: tiene('apodo', 'mote', 'aka', 'llaman', 'llamamos'),
      preguntas: tiene('pregunta', 'cuestionario', 'trivial'),
      dibujos: tiene('dibujo', 'dibuj', 'pintur', 'colorear'),
      relatos: tiene('relato', 'anecdota', 'contar', 'cuentame')
    };
    const general = !Object.values(cats).some(Boolean);

    return forkJoin({
      viajeros: this.leerJson('assets/data/viajeros.json'),
      personajes: this.leerJson('assets/data/personajes.json'),
      cumple: this.leerJson('assets/data/cumpleanyos.json'),
      frases: this.leerJson('assets/data/frases.json'),
      recetas: this.leerJson('assets/data/recetas.json'),
      preguntas: this.leerJson('assets/data/preguntas.json'),
      // apodos: this.leerJson('assets/data/apodos.json'),
      dibujos: this.leerJson('assets/data/dibujos.json'),
      viajes: this.cargarIndiceViajes(),
      relatos: this.cargarRelatos()
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
            partes.push(`VIAJES:\n${viajes.map((v) => this.lineaViaje(v, cats.viajes ? 300 : 200)).join('\n')}`);
          }
        }

        if (cats.frases || general) {
          const frases = this.seleccionarFrases(d.frases, q, mencionados, cats.frases ? 10 : 3);
          if (frases.length) partes.push(`FRASES:\n${frases.join('\n')}`);
        }

        if (cats.relatos || general) {
          const relatos = this.seleccionarRelatos(d.relatos, q, 3, 400);
          if (relatos.length) partes.push(`RELATOS:\n${relatos.join('\n')}`);
        }

        const genericas: Array<[string, boolean, unknown]> = [
          ['RECETAS', cats.recetas, d.recetas],
          ['PREGUNTAS', cats.preguntas, d.preguntas],
          // ['APODOS', cats.apodos, d.apodos],
          ['DIBUJOS', cats.dibujos, d.dibujos]
        ];
        for (const [titulo, pedida, datos] of genericas) {
          const lineas = this.seleccionarLineas(this.aLineas(datos), q, 6, pedida ? 6 : 0, 220);
          if (lineas.length) partes.push(`${titulo}:\n${lineas.map((l) => `- ${l}`).join('\n')}`);
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
      if (p.aka.length) partes.push(`Apodos: ${p.aka.join(', ')}`);
      if (p.rasgos.length) partes.push(`Rasgos: ${p.rasgos.join('; ')}`);
      if (p.detalles.length) partes.push(`Detalles: ${p.detalles.join('; ')}`);
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

    return candidatas
      .map((f) => {
        const texto = this.normalizarTexto(`${f['frase']} ${f['explicacion'] ?? ''}`);
        const puntos = this.puntuarTexto(texto, q) + Math.random() * 2; // algo de azar = variedad
        return { f, puntos };
      })
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, max)
      .map(({ f }) => {
        const explic = f['explicacion'] ? ` (= ${this.resumirTexto(f['explicacion'], 90)})` : '';
        return `- ${f['persona']}: «${this.resumirTexto(f['frase'], 110)}»${explic}`;
      });
  }

  /** Texto normalizado, sin signos y rodeado de espacios, para buscar por inicio de palabra. */
  private prepararTexto(texto: string): string {
    return ` ${this.normalizarTexto(texto).replace(/[^a-z0-9]+/g, ' ')} `;
  }

  /** ¿Aparece alguna palabra que EMPIECE por `raiz`? (playa ⊂ playas, pero cala ⊄ escalar) */
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

  /** Elige las líneas que mejor encajan con la consulta; `relleno` = cuántas devolver aunque nada puntúe. */
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

  private seleccionarRelatos(relatos: RelatoIndexado[], q: ConsultaAnalizada, max: number, maxChars: number): string[] {
    return relatos
      .map((r) => ({ r, p: this.puntuarTexto(r.claves, q) }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p)
      .slice(0, max)
      .map(({ r }) => `- ${r.archivo}: ${this.resumirTexto(r.texto, maxChars)}`);
  }

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
                this.indiceViajes$ = undefined; // no "congelar" un fallo de red
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

    const claves = this.normalizarTexto(
      [destino, str(o['categoria']), str(o['provincia']), str(o['pais']), estancia, transporte, personas.join(' '), str(o['anyo']), textos.join(' ')].join(' ')
    ).slice(0, 2500);

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
      resumen: this.resumirTexto(parrafos.slice(0, 2).join(' '), 380),
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
      for (const tema of q.temas) {
        if (tema.afines.some((a) => this.contienePalabra(claves, a))) p += 4;
        if (tema.opuestos?.some((o) => this.contienePalabra(claves, o))) p -= 6;
      }
      const personasNorm = this.normalizarTexto(v.personas.join(' '));
      for (const id of mencionados) {
        if (personasNorm.includes(id)) p += 1;
      }
      return { v, p, i, azar: Math.random() * 1.5 };
    });

    const positivos = puntuados
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p + b.azar - (a.p + a.azar))
      .slice(0, max)
      .map((x) => x.v);

    if (positivos.length > 0 || !rellenarSiVacio) {
      return positivos;
    }

    // Nada encaja: unos pocos recientes (el índice viene del más nuevo al más antiguo)
    return indice.slice(0, Math.min(2, max));
  }

  private lineaViaje(v: ViajeIndexado, maxResumen: number): string {
    const lugar = [v.destino, v.provincia && v.provincia !== v.destino ? v.provincia : '', v.pais]
      .filter(Boolean)
      .join(', ');
    const meta = [v.categoria, v.estancia, v.transporte].filter(Boolean).join(' / ');
    const con = v.personas.length ? ` Con: ${v.personas.join(', ')}.` : '';
    const resumen = v.resumen ? ` ${this.resumirTexto(v.resumen, maxResumen)}` : '';
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
      /* cuota de localStorage llena: seguimos solo con la caché en memoria */
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
    return new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD en hora local
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // ═════════════════════════════════════════════════════════
  //  ILUSTRACIONES
  // ═════════════════════════════════════════════════════════

  /**
   * Ilustración con IA vía Puter.js ("user-pays": el uso se carga a la cuenta de Puter de quien
   * lo ejecuta; la primera vez abre un popup de inicio de sesión → llamarlo desde un clic directo).
   */
  generarIlustracionPuter(titulo: string, escena: string): Observable<string> {
    const prompt = [
      'Ilustración de libro de cuentos infantil, acuarela cálida y luminosa, personajes tiernos y sonrientes,',
      'composición clara, sin texto ni letras ni marcas de agua.',
      `Cuento: ${titulo}.`,
      `Escena: ${this.resumirTexto(escena, 350)}`
    ].join(' ');

    return defer(() => from(this.cargarPuter())).pipe(
      switchMap((puter) => from(this.probarModelosPuter(puter, prompt, 0))),
      timeout(120000)
    );
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
      if (indice + 1 < this.modelosImagenPuter.length) {
        return this.probarModelosPuter(puter, prompt, indice + 1);
      }
      throw err instanceof Error ? err : new Error(String((err as any)?.error?.message ?? 'Error de Puter'));
    }
  }

  /** Convierte blob:/http: en data: para que Angular lo acepte siempre en [src]. */
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


  //*****************************************************************************
  //***************** PARA LA GENERACIÓN DE IMÁGENES ****************************
  //*****************************************************************************

  obtenerImagenApiKey(): string {
    return (localStorage.getItem(this.storageKeyImagen) ?? '').trim();
  }

  /**
   * Intenta generar una ilustración combinando imágenes de referencia (perfiles/viajes)
   * y el texto del cuento a través de varios proveedores; si todos fallan o no hay
   * cuota/clave, devuelve el collage de fotos reales en canvas.
   */
  generarIlustracionCuentoConReferencias(
    promptCuento: string,
    textoCuento: string
  ): Observable<string | null> {
    const q = this.analizarConsulta(`${promptCuento} ${textoCuento}`);
    const resumenEscena = this.resumirEscenaParaIlustracion(promptCuento, textoCuento);

    return forkJoin({
      fotosPerfiles: this.buscarFotosPerfilesPorPrompt(q),
      fotosViajes: this.buscarFotosViajesPorPrompt(q)
    }).pipe(
      switchMap(({ fotosPerfiles, fotosViajes }) => {
        const rutasReferencia = Array.from(new Set([...fotosPerfiles, ...fotosViajes]))
          .filter(Boolean)
          .slice(0, 3);

        const cargasBase64 = rutasReferencia.map((ruta) =>
          this.obtenerBase64Asset(ruta).pipe(catchError(() => of(null)))
        );

        const referencias$: Observable<Array<{ base64: string; mimeType: string }>> =
          cargasBase64.length > 0
            ? forkJoin(cargasBase64).pipe(
                map((items) =>
                  items.filter((x): x is { base64: string; mimeType: string } =>
                    Boolean(x && x.base64)
                  )
                )
              )
            : of([]);

        return referencias$.pipe(
          switchMap((imagenesRef) =>
            this.probarCadenaProveedoresImagen(imagenesRef, resumenEscena, promptCuento)
          )
        );
      }),
      catchError(() => this.crearCollageDesdePrompt(promptCuento))
    );
  }

  private probarCadenaProveedoresImagen(
    imagenesRef: Array<{ base64: string; mimeType: string }>,
    resumenEscena: string,
    promptOriginal: string
  ): Observable<string | null> {
    const claves = this.obtenerClaves();
    const geminiKey = claves.gemini;
    const imagenKey = this.obtenerImagenApiKey();

    const pasos: Array<() => Observable<string | null>> = [];

    // 1. Gemini multimodal con imágenes de referencia + descripción del cuento
    if (geminiKey) {
      for (const modelo of this.modelosImagenGemini) {
        if (this.enfriamiento.has(`gemini-img:${modelo}`) && (this.enfriamiento.get(`gemini-img:${modelo}`) ?? 0) > Date.now()) {
          continue;
        }
        pasos.push(() =>
          this.llamarGeminiImagenConReferencias(geminiKey, modelo, imagenesRef, resumenEscena).pipe(
            catchError((err) => {
              const info = this.clasificarError(err);
              this.enfriamiento.set(`gemini-img:${modelo}`, Date.now() + info.esperaMs);
              return of(null);
            })
          )
        );
      }
    }

    // 2. Proveedor externo de imágenes con clave propia (imagen_familia_api_key)
    if (imagenKey) {
      pasos.push(() =>
        this.llamarProveedorImagenExterno(imagenKey, resumenEscena, imagenesRef[0]).pipe(
          catchError(() => of(null))
        )
      );
    }

    // 3. Respaldo garantizado: collage con fotos reales de la familia
    pasos.push(() => this.crearCollageDesdePrompt(promptOriginal));

    const ejecutarPaso = (idx: number): Observable<string | null> => {
      if (idx >= pasos.length) {
        return of(null);
      }
      return pasos[idx]().pipe(
        switchMap((resultado) => (resultado ? of(resultado) : ejecutarPaso(idx + 1)))
      );
    };

    return ejecutarPaso(0);
  }

  private llamarGeminiImagenConReferencias(
    apiKey: string,
    modelo: string,
    imagenesRef: Array<{ base64: string; mimeType: string }>,
    resumenEscena: string
  ): Observable<string | null> {
    const partes: any[] = imagenesRef.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64
      }
    }));

    partes.push({
      text: [
        'Crea una ilustración infantil cálida, colorida y alegre para un libro de cuentos.',
        'Usa las imágenes de referencia como inspiración para los personajes y/o escenarios.',
        `Escena y trama del cuento: ${resumenEscena}`,
        'Estilo: acuarela o ilustración infantil amigable y luminosa, sin texto ni marcas de agua.'
      ].join(' ')
    });

    return defer(() => {
      const ai = new GoogleGenAI({ apiKey });
      return from(
        ai.models.generateContent({
          model: modelo,
          contents: partes
        })
      );
    }).pipe(
      timeout(25000),
      map((response) => {
        const candidates = (response as any)?.candidates ?? [];
        const parts = candidates[0]?.content?.parts ?? (response as any)?.parts ?? [];
        const imgPart = parts.find((p: any) => p?.inlineData?.data);
        if (!imgPart?.inlineData?.data) {
          return null;
        }
        const mime = imgPart.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${imgPart.inlineData.data}`;
      })
    );
  }

  /**
   * Conector listo para un proveedor de imágenes vía REST usando `imagen_familia_api_key`.
   * Ajusta la URL y el cuerpo según el proveedor que elijas (p. ej. endpoint de generación/edición).
   */
  private llamarProveedorImagenExterno(
    apiKey: string,
    resumenEscena: string,
    primeraImagenRef?: { base64: string; mimeType: string }
  ): Observable<string | null> {
    const endpoint = ''; // Configura aquí el endpoint REST de tu proveedor de imágenes
    if (!endpoint) {
      return of(null);
    }

    const payload: Record<string, unknown> = {
      prompt: `Ilustración infantil colorida y tierna, sin texto: ${resumenEscena}`,
      ...(primeraImagenRef
        ? {
            image_base64: primeraImagenRef.base64,
            mime_type: primeraImagenRef.mimeType
          }
        : {})
    };

    return this.http
      .post<any>(endpoint, payload, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        })
      })
      .pipe(
        timeout(25000),
        map((res) => {
          if (typeof res?.image === 'string' && res.image) {
            return res.image.startsWith('data:') ? res.image : `data:image/png;base64,${res.image}`;
          }
          if (typeof res?.url === 'string' && res.url) {
            return res.url;
          }
          return null;
        })
      );
  }

  private obtenerBase64Asset(ruta: string): Observable<{ base64: string; mimeType: string }> {
    return this.http.get(ruta, { responseType: 'blob' }).pipe(
      switchMap(
        (blob) =>
          new Observable<{ base64: string; mimeType: string }>((observer) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const raw = String(reader.result || '');
              const base64 = raw.split(',')[1] || '';
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

  private resumirEscenaParaIlustracion(promptCuento: string, textoCuento: string): string {
    const limpio = (textoCuento || '')
      .replace(/\s+/g, ' ')
      .trim();
    const extracto = this.resumirTexto(limpio, 380);
    return `Petición: ${promptCuento}. Historia: ${extracto}`;
  }
}
