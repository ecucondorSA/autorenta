import { isPlatformBrowser, registerLocaleData } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import localeEsAr from '@angular/common/locales/es-AR';
import localePtBr from '@angular/common/locales/pt';
import localeEn from '@angular/common/locales/en';

/**
 * LocaleManagerService
 *
 * Gestiona la sincronización entre el idioma de traducción (ngx-translate)
 * y el locale de Angular (LOCALE_ID, DatePipe, CurrencyPipe, etc.)
 *
 * Características:
 * - Registra automáticamente los locales necesarios
 * - Sincroniza el idioma de traducción con el formato de fechas/moneda
 * - Persiste la preferencia en localStorage
 */
@Injectable({
  providedIn: 'root',
})
export class LocaleManagerService {
  private readonly translateService = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private currentLocale: string = 'es-AR';

  constructor() {
    // Registrar todos los locales soportados (safe during SSR)
    registerLocaleData(localeEsAr, 'es-AR');
    registerLocaleData(localePtBr, 'pt-BR');
    registerLocaleData(localeEn, 'en-US');

    // Configurar idioma por defecto (fallback)
    this.translateService.setDefaultLang('es');

    // SSR-safe: Only load saved language and subscribe in browser
    if (this.isBrowser) {
      // Cargar idioma guardado o usar default
      const savedLang = this.getSavedLanguage();
      this.setLanguage(savedLang);

      // Escuchar cambios de idioma
      this.translateService.onLangChange.subscribe((event) => {
        this.currentLocale = this.getLocaleFromLang(event.lang);
      });
    } else {
      // Durante SSR usar idioma default
      this.translateService.use('es');
    }
  }

  /**
   * Cambia el idioma de la aplicación
   */
  setLanguage(lang: 'es' | 'pt' | 'en'): void {
    this.translateService.use(lang);
    this.currentLocale = this.getLocaleFromLang(lang);

    if (this.isBrowser) {
      // Persistir en localStorage
      localStorage.setItem('app_lang', lang);

      // Actualizar atributo HTML lang
      document.documentElement.lang = lang;
    }
  }

  /**
   * Obtiene el idioma actual
   */
  getCurrentLanguage(): string {
    return this.translateService.currentLang || this.translateService.defaultLang || 'es';
  }

  /**
   * Obtiene el locale actual (ej: 'es-AR', 'pt-BR', 'en-US')
   */
  getCurrentLocale(): string {
    return this.currentLocale;
  }

  /**
   * Convierte código de idioma a locale completo
   */
  private getLocaleFromLang(lang: string): string {
    const localeMap: Record<string, string> = {
      es: 'es-AR',
      pt: 'pt-BR',
      en: 'en-US',
    };

    return localeMap[lang] || 'es-AR';
  }

  /**
   * Obtiene el idioma guardado en localStorage
   */
  private getSavedLanguage(): 'es' | 'pt' | 'en' {
    if (!this.isBrowser) return 'es';

    const saved = localStorage.getItem('app_lang');

    if (saved === 'es' || saved === 'pt' || saved === 'en') {
      return saved;
    }

    // Detectar idioma del navegador
    const browserLang = navigator.language.toLowerCase();

    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('en')) return 'en';

    return 'es'; // Default
  }
}
