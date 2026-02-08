import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '@core/services/auth/profile.service';
import { VerificationService } from '@core/services/verification/verification.service';
import { UserProfile } from '../../../core/models';

/**
 * VerificationPromptBannerComponent
 *
 * Banner prominente que aparece cuando el usuario tiene verificación pendiente
 * Guía al usuario al flujo de verificación con instrucciones claras
 *
 * Características:
 * - Aparece automáticamente después del login si no está verificado
 * - Muestra progreso de verificación (0%, 50%, 100%)
 * - Botón CTA directo a la página de verificación
 * - Dismissible (se puede cerrar temporalmente)
 * - Re-aparece en cada login hasta completar verificación
 *
 * Ubicación: Debajo del header en todas las páginas
 */
@Component({
  selector: 'app-verification-prompt-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  template: `
    @if (shouldShow()) {
      <div
        class="bg-gradient-to-r from-warning-light to-cta-default text-text-primary shadow-lg"
        role="alert"
        aria-live="polite"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-start justify-between gap-4">
            <!-- Avatar + Icon + Content -->
            <div class="flex items-start gap-4 flex-1">
              <!-- Avatar -->
              <div class="flex-shrink-0">
                <div class="relative h-12 w-12">
                  <!-- Avatar Image or Placeholder -->
                  <div
                    class="h-full w-full rounded-full overflow-hidden bg-surface-raised/20 border-2 border-white/40"
                  >
                    @if (profile()?.avatar_url) {
                      <img
                        [src]="profile()!.avatar_url"
                        [alt]="profile()?.full_name || 'Usuario'"
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                    } @else {
                      <div
                        class="h-full w-full flex items-center justify-center bg-surface-raised/30"
                      >
                        <svg
                          class="h-7 w-7 text-text-primary/80"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>
                    }
                  </div>
                  <!-- Status Icon Badge -->
                  <div
                    class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-warning-light to-cta-default border-2 border-white flex items-center justify-center"
                  >
                    @if (verificationProgress() < 100) {
                      <svg
                        class="h-3 w-3 text-warning-300 animate-pulse"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    }
                    @if (verificationProgress() === 100) {
                      <svg
                        class="h-3 w-3 text-success-strong"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12l2 2 4-4"
                        />
                      </svg>
                    }
                  </div>
                </div>
              </div>
              <!-- Text Content -->
              <div class="flex-1 min-w-0 stack-sm">
                <h3 class="h4 text-text-primary">
                  {{ title() }}
                </h3>
                <p class="text-sm opacity-90">
                  {{ description() }}
                </p>
                <!-- Progress Bar (solo si no está completo) -->
                @if (verificationProgress() < 100) {
                  <div class="stack-xs">
                    <div class="flex items-center justify-between text-xs">
                      <span>Progreso de verificación</span>
                      <span class="font-semibold">{{ verificationProgress() }}%</span>
                    </div>
                    <div class="w-full bg-surface-raised/20 rounded-full h-2 overflow-hidden">
                      <div
                        class="bg-surface-raised h-full rounded-full transition-all duration-500"
                        [style.width.%]="verificationProgress()"
                      ></div>
                    </div>
                  </div>
                }
                <!-- Action Buttons -->
                <div class="flex flex-wrap items-center gap-3">
                  <a
                    routerLink="/profile"
                    [queryParams]="{ tab: 'verification' }"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-surface-raised text-cta-default rounded-lg text-sm font-semibold hover:bg-ivory-luminous transition-colors shadow-md hover:shadow-lg"
                  >
                    <svg
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    {{ ctaButtonText() }}
                  </a>
                  @if (!isWelcome()) {
                    <button
                      type="button"
                      (click)="viewBenefits()"
                      class="inline-flex items-center gap-1 text-sm text-text-inverse/90 hover:text-text-inverse underline"
                    >
                      ¿Por qué verificar mi identidad?
                    </button>
                  }
                </div>
              </div>
            </div>
            <!-- Close Button -->
            <button
              type="button"
              (click)="dismiss()"
              class="flex-shrink-0 text-text-inverse/80 hover:text-text-inverse transition-colors"
              aria-label="Cerrar banner"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Benefits Modal (inline simple version) -->
    @if (showBenefits()) {
      <div
        class="fixed inset-0 bg-surface-overlay/50 z-50 flex items-center justify-center p-4"
        (click)="closeBenefits()"
      >
        <div
          class="bg-surface-raised rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between mb-4">
            <h2 class="h3 text-text-primary">¿Por qué verificar tu identidad?</h2>
            <button
              type="button"
              (click)="closeBenefits()"
              class="text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="space-y-4 text-text-primary">
            <div class="flex items-start gap-3">
              <div
                class="flex-shrink-0 w-10 h-10 bg-success-light/20 rounded-full flex items-center justify-center"
              >
                <svg
                  class="w-5 h-5 text-success-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold mb-1">Mayor confianza en la comunidad</h3>
                <p class="text-sm">
                  Los usuarios verificados generan +40% más reservas porque inspiran confianza.
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div
                class="flex-shrink-0 w-10 h-10 bg-cta-default/20 rounded-full flex items-center justify-center"
              >
                <svg
                  class="w-5 h-5 text-cta-default"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold mb-1">Protección contra fraude</h3>
                <p class="text-sm">
                  Verificamos tu identidad para prevenir suplantaciones y actividades fraudulentas.
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div
                class="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"
              >
                <svg
                  class="w-5 h-5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold mb-1">Acceso prioritario a funciones</h3>
                <p class="text-sm">
                  Usuarios verificados pueden publicar autos, solicitar retiros y acceder a
                  beneficios exclusivos.
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div
                class="flex-shrink-0 w-10 h-10 bg-warning-bg-hover rounded-full flex items-center justify-center"
              >
                <svg
                  class="w-5 h-5 text-warning-text"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold mb-1">Proceso rápido y seguro</h3>
                <p class="text-sm">
                  Solo tomará 5 minutos. Tus datos están protegidos con encriptación de nivel
                  bancario.
                </p>
              </div>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              (click)="closeBenefits()"
              class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cerrar
            </button>
            <a
              routerLink="/profile"
              [queryParams]="{ tab: 'verification' }"
              (click)="closeBenefits()"
              class="px-4 py-2 bg-cta-default text-cta-text rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Iniciar verificación
            </a>
          </div>
        </div>
      </div>
    }
  `,
})
export class VerificationPromptBannerComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly verificationService = inject(VerificationService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly dismissed = signal(false);
  readonly showBenefits = signal(false);
  readonly profile = signal<UserProfile | null>(null);

  async ngOnInit(): Promise<void> {
    // Check if banner was dismissed in this session
    if (this.isBrowser) {
      const dismissed = sessionStorage.getItem('verification_banner_dismissed');
      if (dismissed) {
        this.dismissed.set(true);
        return;
      }
    }

    // Load user profile
    await this.loadProfile();

    // Load verification signals (non-blocking) so we can show the right banner state.
    void this.verificationService.loadDocuments();
    void this.verificationService.loadStatuses();
  }

  private async loadProfile(): Promise<void> {
    try {
      const profile = await this.profileService.getCurrentProfile();
      this.profile.set(profile);
    } catch {
      /* Silenced */
    }
  }

  /**
   * Derive a coarse verification state.
   * NOTE: `profiles.kyc` does not exist in production schema.
   */
  private readonly verificationState = computed(() => {
    const profile = this.profile();
    if (!profile) return 'not_started' as const;

    if (profile.id_verified) return 'verified' as const;

    const statuses = this.verificationService.statuses();
    if (statuses.some((s) => s.status === 'RECHAZADO')) return 'rejected' as const;
    if (statuses.some((s) => s.status === 'PENDIENTE')) return 'pending' as const;

    const docs = this.verificationService.documents();
    if (docs.some((d) => d.status === 'rejected')) return 'rejected' as const;
    if (docs.some((d) => d.status === 'pending' || d.status === 'verified')) return 'pending' as const;
    if (docs.length > 0) return 'pending' as const;

    return 'not_started' as const;
  });

  /**
   * Calcula si el banner debe mostrarse
   */
  readonly shouldShow = computed(() => {
    const profile = this.profile();
    const dismissed = this.dismissed();

    if (!profile || dismissed) return false;

    // Show if the user is not Level 2 verified
    return this.verificationState() !== 'verified';
  });

  /**
   * Calcula el progreso de verificación (0-100)
   */
  readonly verificationProgress = computed(() => {
    switch (this.verificationState()) {
      case 'verified':
        return 100;
      case 'pending':
        return 50;
      case 'rejected':
        return 25;
      default:
        return 0;
    }
  });

  /**
   * Determina si es el mensaje de bienvenida (primera vez)
   */
  readonly isWelcome = computed(() => {
    return this.verificationState() === 'not_started';
  });

  /**
   * Título del banner según el estado
   */
  readonly title = computed(() => {
    switch (this.verificationState()) {
      case 'not_started':
        return 'Verificá tu identidad para comenzar';
      case 'pending':
        return 'Verificación en proceso';
      case 'rejected':
        return 'Necesitamos que revises tus documentos';
      default:
        return 'Verificación pendiente';
    }
  });

  /**
   * Descripción del banner según el estado
   */
  readonly description = computed(() => {
    switch (this.verificationState()) {
      case 'not_started':
        return 'Completá tu verificación para publicar autos, reservar vehículos y acceder a todas las funciones.';
      case 'pending':
        return 'Estamos revisando tu documentación. Te notificaremos cuando esté lista.';
      case 'rejected':
        return 'Tu verificación fue rechazada. Revisá los comentarios y volvé a subir la documentación correcta.';
      default:
        return 'Completá el proceso de verificación para acceder a todas las funcionalidades.';
    }
  });

  /**
   * Texto del botón CTA
   */
  readonly ctaButtonText = computed(() => {
    switch (this.verificationState()) {
      case 'not_started':
        return 'Verificar ahora';
      case 'pending':
        return 'Ver estado';
      case 'rejected':
        return 'Revisar documentos';
      default:
        return 'Ir a verificación';
    }
  });

  dismiss(): void {
    this.dismissed.set(true);

    // Guardar en localStorage para no mostrar en esta sesión
    // Guardar en localStorage para no mostrar en esta sesión
    if (this.isBrowser) {
      sessionStorage.setItem('verification_banner_dismissed', Date.now().toString());
    }
  }

  viewBenefits(): void {
    this.showBenefits.set(true);
  }

  closeBenefits(): void {
    this.showBenefits.set(false);
  }
}
