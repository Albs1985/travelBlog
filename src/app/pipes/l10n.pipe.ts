import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Texto } from '../interfaces/viaje.interface';

/**
 * Muestra un texto multi-idioma ({ es: '...', val: '...' }) en el idioma activo.
 * Si falta ese idioma, usa el castellano y, si tampoco, cualquier otro disponible.
 * Es "impura" a propósito: así se actualiza sola al cambiar de idioma.
 *
 *   {{ bloque.texto | l10n }}
 */
@Pipe({ name: 'l10n', pure: false })
export class L10nPipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(valor: Texto | string | null | undefined): string {
    if (!valor) return '';
    if (typeof valor === 'string') return valor;
    const idioma = this.translate.currentLang || this.translate.defaultLang || 'es';
    return valor[idioma] || valor['es'] || valor['val'] || Object.values(valor)[0] || '';
  }
}
