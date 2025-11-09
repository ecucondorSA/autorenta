import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, SupportedLanguage } from '../../../core/services/language.service';

/**
 * LanguageSelectorComponent
 *
 * Componente standalone para cambiar el idioma de la aplicación.
 *
 * Características:
 * - Dropdown con idiomas disponibles
 * - Banderas de países
 * - Persistencia automática del idioma seleccionado
 * - Diseño responsive
 *
 * Uso:
 * ```html
 * <app-language-selector></app-language-selector>
 * ```
 */
@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="relative">
      <!-- Botón del selector -->
      <button
        type="button"
        (click)="toggleDropdown()"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary dark:text-text-secondary hover:bg-surface-secondary/50 dark:hover:bg-slate-deep/50 transition-base focus:outline-none focus:ring-2 focus:ring-cta-default/50"
        [attr.aria-expanded]="isOpen()"
        aria-label="Seleccionar idioma"
      >
        <span class="text-lg">{{ languageService.getCurrentLanguageFlag() }}</span>
        <span class="hidden sm:inline">{{ languageService.getCurrentLanguageName() }}</span>
        <svg
          class="w-4 h-4 transition-transform"
          [class.rotate-180]="isOpen()"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <!-- Dropdown menu -->
      <div
        *ngIf="isOpen()"
        class="absolute right-0 mt-2 w-48 bg-surface-raised dark:bg-surface-raised border border-border-default dark:border-slate-deep rounded-xl shadow-elevated dark:shadow-card overflow-hidden z-50"
        role="menu"
        aria-orientation="vertical"
      >
        <button
          *ngFor="let lang of languageService.availableLanguages"
          type="button"
          (click)="selectLanguage(lang.code)"
          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary dark:text-text-secondary hover:bg-surface-secondary dark:hover:bg-slate-deep transition-base"
          [class.bg-cta-default/10]="lang.code === languageService.currentLanguage()"
          [class.font-semibold]="lang.code === languageService.currentLanguage()"
          role="menuitem"
        >
          <span class="text-xl">{{ lang.flag }}</span>
          <span class="flex-1 text-left">{{ lang.name }}</span>
          <svg
            *ngIf="lang.code === languageService.currentLanguage()"
            class="w-5 h-5 text-cta-default"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Overlay para cerrar al hacer click fuera -->
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 z-40"
      (click)="closeDropdown()"
      aria-hidden="true"
    ></div>
  `,
  styles: [],
})
export class LanguageSelectorComponent {
  readonly languageService = inject(LanguageService);
  readonly isOpen = signal(false);

  toggleDropdown(): void {
    this.isOpen.update((v) => !v);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  selectLanguage(lang: SupportedLanguage): void {
    this.languageService.setLanguage(lang);
    this.closeDropdown();
  }
}
