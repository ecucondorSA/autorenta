import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { GuidedTourService } from '../../../core/guided-tour/guided-tour.service';
import { TourId } from '../../../core/guided-tour/interfaces/tour-definition.interface';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-help-button',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="relative">
      <button
        id="help-center"
        data-tour-step="welcome-help"
        class="icon-button h-10 w-10 lg:h-11 lg:w-11"
        (click)="toggleMenu()"
        [attr.aria-label]="'common.help' | translate"
        [attr.aria-expanded]="showMenu()"
        type="button"
      >
        <svg
          class="w-5 h-5 lg:w-6 lg:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
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
        <div class="fixed inset-0 z-40" (click)="closeMenu()" aria-hidden="true"></div>

        <!-- Menu dropdown -->
        <div
          class="help-dropdown absolute right-0 mt-2 w-80 card-premium shadow-elevated p-4 z-50 animate-fade-in"
          role="menu"
          aria-labelledby="help-center"
        >
          <h3 class="text-sm font-semibold mb-3 text-text-primary dark:text-text-primary">
            Centro de ayuda
          </h3>

          <!-- Convertite en Renter (destacado) -->
          <button
            (click)="navigateToBecomeRenter()"
            class="w-full text-left px-4 py-3 rounded-lg bg-gradient-to-r from-cta-default/10 to-cta-hover/10 hover:from-cta-default/20 hover:to-cta-hover/20 dark:from-cyan-500/10 dark:to-cyan-600/10 dark:hover:from-cyan-500/20 dark:hover:to-cyan-600/20 mb-3 transition-base border border-cta-default/20 dark:border-cyan-500/20"
            role="menuitem"
          >
            <div class="flex items-start gap-3">
              <div class="text-xl">🏠</div>
              <div class="flex-1">
                <div class="font-semibold text-sm text-cta-default dark:text-cyan-400 mb-1">
                  Convertite en Renter
                </div>
                <div class="text-xs text-text-muted dark:text-gray-400">
                  Publicá tu auto y generá ingresos extras
                </div>
              </div>
            </div>
          </button>

          <!-- Invitar amigo -->
          @if (isAuthenticated()) {
            <button
              (click)="navigateToReferrals()"
              class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-secondary dark:hover:bg-slate-deep text-sm mb-2 transition-base text-text-secondary dark:text-text-secondary flex items-center gap-2"
              role="menuitem"
            >
              <span class="text-lg">🎁</span>
              <span>Invitá a un amigo Renter</span>
            </button>
          }

          <hr class="my-2 border-border-default/40 dark:border-white/10" />

          <!-- Tours guiados -->
          <div class="text-xs font-medium text-text-muted dark:text-gray-400 px-3 mb-2">
            Tours guiados
          </div>

          <button
            (click)="showTour('welcome')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary dark:hover:bg-slate-deep text-sm mb-1 transition-base text-text-secondary dark:text-text-secondary flex items-center gap-2"
            role="menuitem"
          >
            <span>🎯</span>
            <span>Tour de bienvenida</span>
          </button>

          <button
            (click)="showTour('renter')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary dark:hover:bg-slate-deep text-sm mb-1 transition-base text-text-secondary dark:text-text-secondary flex items-center gap-2"
            role="menuitem"
          >
            <span>🔍</span>
            <span>Cómo buscar y reservar autos</span>
          </button>

          <button
            (click)="showTour('become-renter')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary dark:hover:bg-slate-deep text-sm mb-1 transition-base text-text-secondary dark:text-text-secondary flex items-center gap-2"
            role="menuitem"
          >
            <span>🏠</span>
            <span>Convertirse en Renter</span>
          </button>

          <button
            (click)="showTour('publish-car')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary dark:hover:bg-slate-deep text-sm mb-1 transition-base text-text-secondary dark:text-text-secondary flex items-center gap-2"
            role="menuitem"
          >
            <span>💸</span>
            <span>Cómo publicar mi auto</span>
          </button>

          <button
            (click)="showTour('referrals')"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary dark:hover:bg-slate-deep text-sm mb-1 transition-base text-text-secondary dark:text-text-secondary flex items-center gap-2"
            role="menuitem"
          >
            <span>🎁</span>
            <span>Sistema de referidos</span>
          </button>

          @if (isAuthenticated()) {
            <button
              (click)="showTour('wallet')"
              class="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary dark:hover:bg-slate-deep text-sm mb-2 transition-base text-text-secondary dark:text-text-secondary flex items-center gap-2"
              role="menuitem"
            >
              <span>💰</span>
              <span>Wallet y ganancias</span>
            </button>
          }

          <hr class="my-2 border-border-default/40 dark:border-white/10" />

          <!-- Soporte -->
          <a
            href="mailto:soporte@autorentar.com"
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-secondary dark:hover:bg-slate-deep text-sm flex items-center gap-2 transition-base text-text-secondary dark:text-text-secondary mb-2"
            role="menuitem"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Contactar soporte
          </a>

          <!-- Login si no está autenticado -->
          @if (!isAuthenticated()) {
            <button
              (click)="navigateToLogin()"
              class="w-full text-left px-3 py-2 rounded-lg bg-cta-default hover:bg-cta-hover dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-sm font-medium transition-base flex items-center justify-center gap-2"
              role="menuitem"
            >
              Iniciá sesión o registrate
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .help-dropdown {
        border-radius: 1rem;
      }

      @media (max-width: 768px) {
        .help-dropdown {
          position: fixed;
          left: 1rem;
          right: 1rem;
          top: 4.25rem;
          width: auto;
          max-height: calc(100vh - 5.5rem);
          overflow-y: auto;
        }
      }
    `,
  ],
})
export class HelpButtonComponent {
  private readonly guidedTour = inject(GuidedTourService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly showMenu = signal(false);
  readonly isAuthenticated = this.authService.isAuthenticated;

  toggleMenu(): void {
    this.showMenu.update((v) => !v);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  showTour(
    tourType:
      | 'welcome'
      | 'renter'
      | 'owner'
      | 'become-renter'
      | 'publish-car'
      | 'referrals'
      | 'wallet',
  ): void {
    this.closeMenu();

    // Map tour types to Tour IDs
    const tourIdMap: Record<
      'welcome' | 'renter' | 'owner' | 'become-renter' | 'publish-car' | 'referrals' | 'wallet',
      TourId
    > = {
      welcome: TourId.Welcome,
      renter: TourId.Renter,
      owner: TourId.Owner,
      'become-renter': TourId.BecomeRenter,
      'publish-car': TourId.PublishCar,
      referrals: TourId.ReferralSystem,
      wallet: TourId.WalletEarnings,
    };

    const tourId = tourIdMap[tourType];

    // Define the required routes for each tour
    const tourRoutes: Record<
      'welcome' | 'renter' | 'owner' | 'become-renter' | 'publish-car' | 'referrals' | 'wallet',
      string | null
    > = {
      welcome: null, // Can be shown anywhere
      renter: '/cars',
      owner: null, // Old tour, keep for compatibility
      'become-renter': '/become-renter',
      'publish-car': '/cars/publish',
      referrals: '/referrals',
      wallet: '/wallet',
    };

    const requiredRoute = tourRoutes[tourType];

    if (requiredRoute && !this.router.url.includes(requiredRoute)) {
      // Navigate to the required route first
      this.router.navigate([requiredRoute]).then(() => {
        setTimeout(() => {
          this.guidedTour.reset(tourId);
          this.guidedTour.request({
            id: tourId,
            mode: 'user-triggered',
            force: true,
          });
        }, 500);
      });
    } else {
      // Start tour immediately
      this.guidedTour.reset(tourId);
      this.guidedTour.request({
        id: tourId,
        mode: 'user-triggered',
        force: true,
      });
    }
  }

  /**
   * Navegar a la página "Convertite en Renter"
   */
  navigateToBecomeRenter(): void {
    this.closeMenu();
    this.router.navigate(['/become-renter']);
  }

  /**
   * Navegar a la página de login/registro
   */
  navigateToLogin(): void {
    this.closeMenu();
    this.router.navigate(['/login']);
  }

  /**
   * Navegar a la página de referidos
   */
  navigateToReferrals(): void {
    this.closeMenu();
    this.router.navigate(['/referrals']);
  }
}
