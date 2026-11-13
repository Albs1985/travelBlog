# Cómo añadir contenido

Todo el contenido se escribe aquí, en `content/`, **una sola vez y con los dos idiomas juntos**.
Después `npm start` (para verlo) o `npm run build` (para publicar) lo convierte solo en lo que lee la web.
Si algo está mal (JSON roto, falta un campo, una foto no existe...) el comando lo dice con un mensaje claro:
los errores (✖) impiden generar; los avisos (⚠) no.

## Textos en varios idiomas
Un texto se escribe `{ "es": "Hola", "val": "Hola" }`. Atajos:
- Si es igual en los dos idiomas, vale la cadena sola: `"Hola"`.
- Si solo escribes un idioma, el otro enseña ese mismo texto (puedes traducir más tarde).

## Viajes · `content/viajes/AAAA-MM-DD_Destino.json`
1. **Fotos** → `src/assets/images/<año>/` con el nombre `<prefijo>Principal.jpg` (portada), `<prefijo>1.jpg`, `<prefijo>2.jpg`...
   (vale .jpg, .jpeg, .JPG, .png, .webp). No hay que contarlas ni listarlas.
2. Copia `content/plantilla-viaje.json` y rellénala. Los **bloques** (`"bloques"`) se pintan en el orden en que los escribas:
   `titulo`, `subtitulo`, `parrafo`, `nota`, `cita`, `foto`, `lista`, `mapa`.
   - Varios `foto` seguidos forman una rejilla; una sola se ve grande. `"n": 4` es la foto `<prefijo>4.jpg`.
   - Las fotos de la carpeta que no pongas en ningún bloque salen solas al final, en "Más fotos".
   - Un bloque con `"oculto": true` se conserva en el archivo pero no se publica.
3. Ya no importa el orden en que se añaden los viajes. Año, anterior/siguiente, nº de fotos, portadas... se calculan solos.
- Categorías válidas: `Playa`, `Montaña`, `Ciudad`, `Nieve`.

## Relatos · `content/relatos/<nombre>.json`  (se ven en `/historias/<nombre>`)
Igual que un viaje, pero sin fotos numeradas: las fotos se ponen con su ruta (`{ "tipo": "foto", "src": "relatoX/foto1.jpg" }`).
Cabecera: `titulo`, `supra` (línea pequeña encima), `fecha`, `icono`, `portada`, `nacimiento` (muestra la edad),
`protegido` (contraseña de los relatos de la familia), `sinIdioma`, `modoLibro` (botón "versión libro"),
`siguiente` (id de un viaje al que enlaza el final). Un relato nuevo no necesita tocar código.

## Frases · `content/frases.json`
```json
{ "persona": "Mateu", "fecha": "2024", "frase": { "es": "...", "val": "..." }, "explicacion": { "es": "...", "val": "..." } }
```
Una línea por frase, en el orden en que se enseñan. La `explicacion` es opcional.

## Dibujos · `content/dibujos.json`
Foto en `src/assets/images/dibujos/dibujo<n>.jpg` (cualquier extensión) y una línea:
```json
{ "n": 14, "persona": "Mateu", "anyo": 2026, "edad": 5, "detalle": { "es": "...", "val": "..." } }
```

## Fotos favoritas · `content/favoritos.json`
Foto en `src/assets/images/favoritos/fotoFav<n>.jpg` (cualquier extensión) y una línea en `"fotos"`:
```json
{ "n": 249, "anyo": "2026", "lugar": "Godella", "etiquetas": "niños, xiquets, cumple", "personas": ["Marina"], "desc": { "es": "...", "val": "..." } }
```
`etiquetas` son palabras extra para el buscador. Las fotos de `src/assets/images/about/about<N>.jpg` salen solas
con los datos comunes de `"about"` (no hay que contarlas). Las fotos sin ficha no se enseñan (te avisa).

## Recetas · `content/recetas.json`
```json
{ "nombre": {"es":"...","val":"..."}, "frase": {...}, "categoria": {"es":"Postre","val":"Postre"},
  "cocinero": "Alba", "dificultad": "3/10", "raciones": 4, "tipos": ["dulce"], "metodo": "horno",
  "tiempoPreparacion": 15, "tiempoCoccion": 25, "temperatura": "180 C", "imagen": "brownie.jpg",
  "ingredientes": [ {...}, {...} ], "utensilios": [ {...} ], "pasos": [ {...}, {...} ] }
```
`tipos`: `frio`, `caliente`, `dulce`. `metodo`: `horno`, `microondas`, `olla`, `nevera`. La imagen va en `src/assets/images/recetas/`.
Los ingredientes y pasos son listas (se numeran solos). El buscador mira nombre, categoría, cocinero e ingredientes en los dos idiomas:
ya no hace falta rellenar listas de palabras clave.

## Preguntas del quiz · `content/preguntas.json`
```json
{ "nivel": "facil", "es": { "pregunta": "...", "correcta": "...", "incorrectas": ["...", "...", "..."] },
                    "val": { "pregunta": "...", "correcta": "...", "incorrectas": ["...", "...", "..."] } }
```
`nivel`: `facil`, `medio`, `dificil`. Las opciones se barajan solas.

## Viajeros · `content/viajeros.json`
`nombre` (el que se usa en las fotos de perfil: `assets/images/perfiles/fotoPerfil<nombre>.jpg`), `nombreCompleto`,
`nacimiento` (AAAA-MM-DD; la edad se calcula sola), `aka` (apodos) e `info` (opcional).

## Otros ajustes
- Un transporte, categoría o tipo de alojamiento nuevo (con su icono): `src/app/services/viajes.catalogo.ts`
  (y su traducción en `src/assets/i18n/*.json` si es un tipo de alojamiento o un país).
- Un idioma nuevo: añadirlo a `IDIOMAS` en `scripts/lib/comun.mjs` y escribir su clave en los textos.
- Lo que NO está aquí y sigue en su sitio: localizaciones del mapa (`src/assets/data/localizaciones.json`) y
  tableros de juegos (`src/assets/data/tableros.json`).
