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
ng serve
ng build
git s
git add .
git commit -m "Texto"
    (a veces también) git pull
git push -u origin main
- Nota: Si tenemos dos ramas, hacer el pull request a la rama Master desde el GIT


## Pasos a tener en cuenta: 
- En desarrollo:
    - Quitar ruta del CSS de Componente Viaje:  background-image: url('/travelBlog/assets/images/fondoPiedras.jpg'); YA NO ESTÁ PUESTA LA IMAGEN
    - Si añadimos viajes anteriores al 2019, cambiar el campo anyoInicio : number = 2019, para que se muestre el boton de anteriores viajes.

- En data: 
    - IMPORTANTE: El orden en que se introducen los datos es importante. Seguir el mismo patron que haya. La ordenación va en función de cuando se insertan, no de fechas u otras cosas.
    - Si añadimos fotos en ABOUT, cambiar el parámetro numFotosAbout : number = 15, del fotos.service.ts
        - Las fotos tienen que ir siempre en formato JGP.
    
- En el i18n:    
    - Añadir las descripciones de las fotos nuevas: tanto de favoritos como de los viajes
    - Añadir las traducciones al i18n de cada viaje. 
    - Si añadimos algun tipo de estancia nuevo, también añadirlo al i18n.    

- En las fotos: 

  - Comprimir el tamaño de las fotos online: https://www.iloveimg.com/

- Para subirlo al GITHub, se sube la carpeta docs, que cuando hacemos el ng build se sobreescribe con el proyecto compilado y los cambios de los assets.
    - En la ruta: https://github.com/Albs1985/travelBlog/settings/pages, tenemos lo que se publica (GitHub Pages).

 URLs de documentación:
    https://codepen.io/sosuke/pen/Pjoqqp
    https://htmlcolorcodes.com/es/
    https://console.firebase.google.com/u/0/project/angular-html-b9db3/database/angular-html-b9db3-default-rtdb/data/~2Fequipo
    https://materializecss.com/
    https://www.udemy.com/course/html-hacia-angular/
    https://timdeschryver.dev/blog/google-maps-as-an-angular-component#map-marker-output-properties
    https://htmltemplates.co/
    https://www.free-css.com/free-css-templates/page220/appsea
    https://github.com/animate-css/animate.css/tree/main/source
    https://codemain.pro/aplicacion-web-multi-idioma-con-angular-y-ngx-translate/
    https://animate.style/
    https://confluence.mercadona.com/display/MI/CRE085+Fwk+Front+Angular+Responsive+de+Mercadona+-+Intermedio?preview=/925089867/932458055/Curso%20medio%20Angular.pdf
    https://codepen.io/Klerith/pen/RZpwKm
    https://sweetalert2.github.io/
    https://bootswatch.com/
    https://www.infragistics.com/products/ignite-ui-angular/angular/components/calendar
