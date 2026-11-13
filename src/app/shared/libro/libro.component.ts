import { Component, Input } from '@angular/core';
import { Bloque, Texto } from '../../interfaces/viaje.interface';

/** Texto de una página del libro. */
export interface TextoLibro {
  tipo: 'titulo' | 'subtitulo' | 'parrafo' | 'nota' | 'cita';
  texto: Texto;
}

/** El CSS del libro tiene preparadas 6 hojas: 5 de texto + la contraportada. */
const MAX_PAGINAS_TEXTO = 5;
const MAX_PARRAFOS_POR_PAGINA = 3;

/** Reparte los textos de unos bloques en páginas (las fotos, mapas y listas no entran en el libro). */
export function paginarBloques(bloques: Bloque[]): TextoLibro[][] {
  const paginas: TextoLibro[][] = [];
  let actual: TextoLibro[] = [];
  let parrafos = 0;
  for (const b of bloques) {
    if (b.tipo === 'fotos' || b.tipo === 'mapa' || b.tipo === 'lista') continue;
    const llena = parrafos >= MAX_PARRAFOS_POR_PAGINA;
    if (actual.length > 0 && (b.tipo === 'titulo' || llena) && paginas.length < MAX_PAGINAS_TEXTO - 1) {
      paginas.push(actual);
      actual = [];
      parrafos = 0;
    }
    actual.push({ tipo: b.tipo, texto: b.texto });
    if (b.tipo !== 'titulo') parrafos++;
  }
  if (actual.length > 0) paginas.push(actual);
  return paginas;
}

/**
 * "Modo libro": los textos en un libro que se hojea.
 *
 *   <app-libro [paginas]="paginas" [titulo]="relato.titulo" [subtitulo]="relato.fecha"></app-libro>
 */
@Component({
  selector: 'app-libro',
  templateUrl: './libro.component.html',
  styleUrls: ['./libro.component.css'],
})
export class LibroComponent {
  @Input() paginas: TextoLibro[][] = [];
  /** Se enseña encima de la primera página (opcional) */
  @Input() titulo?: Texto;
  @Input() subtitulo?: Texto;
}
