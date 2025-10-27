import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * DateFormatPipe
 *
 * Formatea fechas según el idioma activo del usuario.
 * Soporta diferentes formatos: 'short', 'medium', 'long', 'shortTime', 'mediumTime'
 *
 * Uso:
 * ```html
 * {{ booking.start_date | dateFormat }}          <!-- dd/MM/yyyy -->
 * {{ booking.created_at | dateFormat:'medium' }} <!-- dd/MM/yyyy HH:mm -->
 * {{ booking.created_at | dateFormat:'long' }}   <!-- dd 'de' MMMM 'de' yyyy -->
 * ```
 *
 * Formatos por idioma:
 * - es-AR: dd/MM/yyyy
 * - pt-BR: dd/MM/yyyy
 * - en-US: MM/dd/yyyy
 */
@Pipe({
  name: 'dateFormat',
  standalone: true,
  pure: false, // Re-evalúa cuando cambia el idioma
})
export class DateFormatPipe implements PipeTransform {
  private readonly translateService = inject(TranslateService);

  transform(
    value: string | Date | null | undefined,
    format: 'short' | 'medium' | 'long' | 'shortTime' | 'mediumTime' = 'short',
  ): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;

    if (isNaN(date.getTime())) {
      console.warn('[DateFormatPipe] Invalid date:', value);
      return '';
    }

    // Obtener idioma activo (default: es-AR)
    const currentLang =
      this.translateService.currentLang || this.translateService.defaultLang || 'es';
    const locale = this.getLocaleFromLang(currentLang);

    // Configuraciones de formato por tipo
    const formatOptions = this.getFormatOptions(format);

    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
  }

  /**
   * Convierte el código de idioma del TranslateService a un locale completo
   */
  private getLocaleFromLang(lang: string): string {
    const localeMap: Record<string, string> = {
      es: 'es-AR', // Español de Argentina
      pt: 'pt-BR', // Portugués de Brasil
      en: 'en-US', // Inglés de EEUU
    };

    return localeMap[lang] || 'es-AR';
  }

  /**
   * Devuelve las opciones de Intl.DateTimeFormat según el tipo de formato
   */
  private getFormatOptions(format: string): Intl.DateTimeFormatOptions {
    switch (format) {
      case 'short':
        // dd/MM/yyyy
        return {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        };

      case 'medium':
        // dd/MM/yyyy HH:mm
        return {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        };

      case 'long':
        // dd 'de' MMMM 'de' yyyy
        return {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        };

      case 'shortTime':
        // HH:mm
        return {
          hour: '2-digit',
          minute: '2-digit',
        };

      case 'mediumTime':
        // HH:mm:ss
        return {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        };

      default:
        return {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        };
    }
  }
}
