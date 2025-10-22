import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLanguage = 'es' | 'pt';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

/**
 * LanguageService
 *
 * Gestiona el idioma de la aplicación con persistencia en localStorage.
 *
 * Características:
 * - Detección automática del idioma del navegador
 * - Persistencia del idioma seleccionado
 * - Cambio dinámico de idioma sin recargar
 * - Signal reactivo para el idioma actual
 *
 * Idiomas soportados:
 * - Español (es) - Default
 * - Português (pt)
 */
@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly STORAGE_KEY = 'preferred_language';

  /**
   * Signal reactivo del idioma actual
   */
  readonly currentLanguage = signal<SupportedLanguage>('es');

  /**
   * Idiomas disponibles
   */
  readonly availableLanguages: LanguageOption[] = [
    { code: 'es', name: 'Español', flag: '🇦🇷' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
  ];

  constructor() {
    this.initializeLanguage();
  }

  /**
   * Inicializa el idioma de la aplicación
   * Orden de prioridad:
   * 1. Idioma guardado en localStorage
   * 2. Idioma del navegador
   * 3. Idioma por defecto (español)
   */
  private initializeLanguage(): void {
    const savedLanguage = this.getSavedLanguage();
    const browserLanguage = this.detectBrowserLanguage();

    const initialLanguage = savedLanguage || browserLanguage || 'es';

    this.setLanguage(initialLanguage);
  }

  /**
   * Obtiene el idioma guardado en localStorage
   */
  private getSavedLanguage(): SupportedLanguage | null {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'es' || saved === 'pt') {
      return saved;
    }
    return null;
  }

  /**
   * Detecta el idioma del navegador
   */
  private detectBrowserLanguage(): SupportedLanguage {
    const browserLang = navigator.language.toLowerCase();

    if (browserLang.startsWith('pt')) {
      return 'pt';
    }

    // Default a español para países de Latinoamérica
    return 'es';
  }

  /**
   * Cambia el idioma de la aplicación
   */
  setLanguage(lang: SupportedLanguage): void {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
  }

  /**
   * Obtiene una traducción directamente (útil para código TypeScript)
   */
  instant(key: string, params?: object): string {
    return this.translate.instant(key, params);
  }

  /**
   * Obtiene el nombre del idioma actual
   */
  getCurrentLanguageName(): string {
    const current = this.currentLanguage();
    const langOption = this.availableLanguages.find((l) => l.code === current);
    return langOption?.name || 'Español';
  }

  /**
   * Obtiene la bandera del idioma actual
   */
  getCurrentLanguageFlag(): string {
    const current = this.currentLanguage();
    const langOption = this.availableLanguages.find((l) => l.code === current);
    return langOption?.flag || '🇦🇷';
  }
}
