import { isPlatformBrowser } from '@angular/common';
import { Injectable, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import {
  MarketplaceAccountStatus,
  MarketplaceService,
} from '@core/services/bookings/marketplace.service';

/**
 * Service for managing MercadoPago onboarding
 *
 * Responsibilities:
 * - Check MP onboarding status
 * - Open onboarding modal
 * - Dismiss/refresh status
 * - Banner display logic
 */
@Injectable()
export class PublishCarMpOnboardingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly marketplaceService = inject(MarketplaceService);

  // State
  readonly mpStatus = signal<MarketplaceAccountStatus | null>(null);
  readonly mpStatusLoading = signal(false);
  readonly mpStatusError = signal<string | null>(null);
  readonly dismissedOnboarding = signal(false);

  // Computed
  readonly mpReady = computed(() => {
    const status = this.mpStatus();
    return status?.status === 'completed' && status?.canReceivePayments === true;
  });

  readonly showMpBanner = computed(() => {
    return (
      !this.mpStatusLoading() &&
      !this.mpReady() &&
      !this.dismissedOnboarding() &&
      !this.mpStatusError()
    );
  });

  constructor() {
    // Auto-load MP status on init
    this.loadMpStatus();
  }

  /**
   * Load MercadoPago onboarding status
   */
  async loadMpStatus(): Promise<void> {
    this.mpStatusLoading.set(true);
    this.mpStatusError.set(null);

    try {
      const status = await this.marketplaceService.getOnboardingStatus();
      this.mpStatus.set(status);
    } catch (error) {
      // console.error('Failed to load MP status:', error);
      this.mpStatusError.set(
        error instanceof Error ? error.message : 'Error al verificar Mercado Pago',
      );
    } finally {
      this.mpStatusLoading.set(false);
    }
  }

  /**
   * Refresh MP status (re-check)
   */
  async refreshMpStatus(): Promise<void> {
    this.dismissedOnboarding.set(false);
    await this.loadMpStatus();
  }

  /**
   * Open onboarding modal
   */
  async openOnboardingModal(): Promise<boolean> {
    try {
      // Get fresh status
      const status = this.mpStatus();

      if (!status) {
        // First time - initiate onboarding
        const onboardingUrl = await this.marketplaceService.initiateOnboarding();
        if (onboardingUrl) {
          window.open(onboardingUrl, '_blank');
          return true;
        }
        return false;
      }

      // Already started - check status
      if (status.status === 'completed') {
        alert('Tu cuenta de Mercado Pago ya está vinculada correctamente.');
        return true;
      }

      if (status.status === 'pending' && status.onboardingUrl) {
        const shouldContinue = confirm(
          'Ya iniciaste el proceso de vinculación. ¿Querés continuar donde lo dejaste?',
        );
        if (shouldContinue) {
          window.open(status.onboardingUrl, '_blank');
          return true;
        }
      }

      // Re-initiate if needed
      const onboardingUrl = await this.marketplaceService.initiateOnboarding();
      if (onboardingUrl) {
        window.open(onboardingUrl, '_blank');
        return true;
      }

      return false;
    } catch {
      // console.error('Failed to open onboarding modal:', error);
      alert('Error al abrir el proceso de vinculación. Intenta nuevamente.');
      return false;
    }
  }

  /**
   * Dismiss onboarding reminder
   */
  dismissOnboardingReminder(): void {
    this.dismissedOnboarding.set(true);
    // Save to localStorage to persist across reloads
    if (this.isBrowser) localStorage.setItem('mp_onboarding_dismissed', 'true');
  }

  /**
   * Check if onboarding was dismissed
   */
  wasOnboardingDismissed(): boolean {
    if (!this.isBrowser) return false;
    return localStorage.getItem('mp_onboarding_dismissed') === 'true';
  }

  /**
   * Reset dismissal state
   */
  resetDismissal(): void {
    this.dismissedOnboarding.set(false);
    if (this.isBrowser) localStorage.removeItem('mp_onboarding_dismissed');
  }

  /**
   * Get status message for UI
   */
  getStatusMessage(): string {
    const status = this.mpStatus();
    if (!status) return 'Checking...';

    switch (status.status) {
      case 'completed':
        return 'Mercado Pago vinculado correctamente';
      case 'pending':
        return 'Vinculación pendiente - Completá el proceso';
      case 'error':
        return 'Error en la vinculación - Intenta nuevamente';
      default:
        return 'No vinculado';
    }
  }

  /**
   * Check if user can publish cars
   */
  canPublish(): boolean {
    // Users can still publish, but cars will be saved as draft
    // until MP onboarding is complete
    return true;
  }

  /**
   * Get warning message if not ready
   */
  getWarningMessage(): string | null {
    if (this.mpReady()) return null;

    return (
      'Tu auto se guardará como borrador hasta que completes la vinculación con Mercado Pago. ' +
      'Podrás activarlo cuando estés listo.'
    );
  }
}
