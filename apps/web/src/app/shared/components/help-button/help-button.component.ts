import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TourService, TourId } from '../../../core/services/tour.service';

@Component({
  selector: 'app-help-button',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="relative">
      <button
        id="help-center"
        class="icon-button h-10 w-10 lg:h-11 lg:w-11"
        (click)="toggleMenu()"
        [attr.aria-label]="'common.help' | translate"
        [attr.aria-expanded]="showMenu()"
        type="button"
      >
        <svg class="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      @if (showMenu()) {
        <!-- Backdrop -->
        <div
          class="fixed inset-0 z-40"
          (click)="closeMenu()"
          aria-hidden="true"
        ></div>

        <!-- Menu dropdown -->
        <div
          class="absolute right-0 mt-2 w-72 card-premium shadow-elevated p-4 z-50 animate-fade-in"
          role="menu"
          aria-labelledby="help-center"
        >
          <h3 class="text-sm font-semibold mb-3 text-smoke-black dark:text-ivory-luminous">
            ¿Necesitás ayuda?
          </h3>

          <button
            (click)="showTour('welcome')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand-light dark:hover:bg-slate-deep text-sm mb-2 transition-base text-charcoal-medium dark:text-pearl-light"
            role="menuitem"
          >
            🎯 Ver tour de bienvenida
          </button>

          <button
            (click)="showTour('renter')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand-light dark:hover:bg-slate-deep text-sm mb-2 transition-base text-charcoal-medium dark:text-pearl-light"
            role="menuitem"
          >
            🔍 Cómo buscar autos
          </button>

          <button
            (click)="showTour('owner')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand-light dark:hover:bg-slate-deep text-sm mb-2 transition-base text-charcoal-medium dark:text-pearl-light"
            role="menuitem"
          >
            💸 Cómo publicar mi auto
          </button>

          <hr class="my-2 border-pearl-gray/40 dark:border-white/10">

          <a
            href="mailto:soporte@autorentar.com"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-sand-light dark:hover:bg-slate-deep text-sm flex items-center gap-2 transition-base text-charcoal-medium dark:text-pearl-light"
            role="menuitem"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Contactar soporte
          </a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class HelpButtonComponent {
  private readonly tourService = inject(TourService);
  private readonly router = inject(Router);

  readonly showMenu = signal(false);

  toggleMenu(): void {
    this.showMenu.update((v) => !v);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  showTour(tourType: 'welcome' | 'renter' | 'owner'): void {
    this.closeMenu();

    // Map string to TourId enum
    const tourIdMap: Record<'welcome' | 'renter' | 'owner', TourId> = {
      'welcome': TourId.Welcome,
      'renter': TourId.Renter,
      'owner': TourId.Owner,
    };
    const tourId = tourIdMap[tourType];

    // Navegar a la ruta correcta si es necesario
    if (tourType === 'renter' && !this.router.url.includes('/cars')) {
      this.router.navigate(['/cars']).then(() => {
        setTimeout(() => this.tourService.restartTour(tourId), 500);
      });
    } else if (tourType === 'owner' && !this.router.url.includes('/publish')) {
      this.router.navigate(['/cars/publish']).then(() => {
        setTimeout(() => this.tourService.restartTour(tourId), 500);
      });
    } else {
      this.tourService.restartTour(tourId);
    }
  }
}
