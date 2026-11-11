# Cómo añadir un viaje

1. **Fotos** → carpeta `src/assets/images/<año>/` con este nombre:
   `<prefijo>Principal.jpg` (la portada), `<prefijo>1.jpg`, `<prefijo>2.jpg`, `<prefijo>3.jpg`...
   (vale .jpg, .jpeg, .png, .webp). No hay que contarlas ni listarlas en ningún sitio.
2. **Texto y datos** → copia `content/plantilla-viaje.json` a `content/viajes/AAAA-MM-DD_Destino.json` y rellénala.
3. `npm start` para verlo, `npm run build` para publicarlo.

## Reglas

- **Idiomas**: cada texto lleva `"es"` y `"val"`. Si solo escribes uno, el otro idioma enseña ese mismo texto.
- **Bloques** (`"bloques"`): se pintan en el orden en que los escribas. Tipos: `titulo`, `parrafo`, `nota`, `cita`, `foto`, `mapa`.
  - Varios `foto` seguidos forman una rejilla. Una sola `foto` se ve grande y centrada.
  - `"n": 4` es la foto `<prefijo>4.jpg`. El pie de foto (`es`/`val`) es opcional.
  - Las fotos de la carpeta que no pongas en ningún bloque salen solas al final, en "Más fotos".
  - `mapa` pinta el mapa del campo `"mapa"` (la URL del iframe de Google Maps).
- **Orden de los viajes**: ya no importa el orden en que se añaden; se ordenan por `fechaInicio`.
- **Anterior / siguiente**, número de fotos, año, portada... se calculan solos.
- Si algo está mal (JSON roto, falta un campo, una foto no existe...) `npm start` / `npm run build` te lo dice
  con un mensaje claro. Los errores impiden generar; los avisos (⚠) no.
- Categorías válidas: `Playa`, `Montaña`, `Ciudad`, `Nieve`.
- Un transporte, categoría o tipo de alojamiento nuevo (con su icono): `src/app/services/viajes.catalogo.ts`
  (y su traducción en `src/assets/i18n/*.json` si es un tipo de alojamiento o un país).
- Un idioma nuevo: añadirlo a `IDIOMAS` en `scripts/build-data.mjs` y escribir su clave en los textos.
