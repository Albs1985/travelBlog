# TravelBlog

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.0.4.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.


## Comandos
```
npm start            # genera los datos de los viajes y arranca en http://localhost:4200
npm run build        # genera los datos y compila en docs/ (esto es lo que se sube a GitHub Pages)
npm run datos        # solo regenera los datos de los viajes (src/assets/data/generated/)
```
- Usa siempre `npm start` / `npm run build` (no `ng serve` / `ng build` a pelo): así los datos de los viajes se regeneran antes.
- Para subirlo: `git add .` · `git commit -m "Texto"` · (a veces `git pull`) · `git push -u origin main`

## Añadir un viaje
Mira **`content/LEEME.md`**: fotos en `src/assets/images/<año>/`, un archivo por viaje en `content/viajes/`
(copiando `content/plantilla-viaje.json`) y listo. Ya no hay que tocar `viajes.json`, `fotos.json`, `es.json`, `val.json`
ni código, ni contar fotos, ni respetar ningún orden de inserción.

## Cómo está organizado (viajes)
```
content/viajes/*.json          <- LO ÚNICO QUE SE ESCRIBE A MANO: datos + textos (es y val) de cada viaje
src/assets/images/<año>/       <- las fotos (se descubren solas por su nombre)
scripts/build-data.mjs         <- valida y genera los datos para la web (se ejecuta solo)
src/assets/data/generated/     <- GENERADO (index.json + un json por viaje). No editar a mano.
src/assets/i18n/es.json, val.json  <- solo textos de la interfaz (menús, botones...)
```
En el código: `ViajesService` (carga y búsqueda), `L10nPipe` (`{{ texto | l10n }}` para textos en varios idiomas),
`LightboxComponent` (visor de fotos), `CarruselComponent`.

## Otros datos que hay que seguir manteniendo a mano
- Fotos de "About": si se añaden, cambiar `numFotosAbout` en `fotos.service.ts` (siempre en .jpg).
- Descripciones de las fotos de favoritos, frases, dibujos y recetas: siguen en el i18n (es y val).
- Comprimir las fotos antes de subirlas: https://www.iloveimg.com/

## package-lock
El `package-lock.json` antiguo apunta en parte a un registro privado (artifactory), que no existe fuera de la red de la empresa
(fallan `npm ci` y GitHub Actions). Para regenerarlo con el registro público:
`npm config set registry https://registry.npmjs.org/` · borrar `package-lock.json` y `node_modules` · `npm install` · subir el lock nuevo.
Si el mapa deja de compilar tras regenerarlo, fijar `"ol": "9.0.0"` (sin `^`) en `package.json`.

## Publicación automática (opcional)
`opcional/github-actions-deploy.yml` (instrucciones dentro): publica en Pages con cada push, sin compilar en local.
