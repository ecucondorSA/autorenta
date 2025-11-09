import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../../../core/services/profile.service';
import { VerificationService } from '../../../core/services/verification.service';
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
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div
      *ngIf="shouldShow()"
      class="bg-gradient-to-r from-accent-warm to-accent-petrol text-white shadow-lg"
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
                  class="h-full w-full rounded-full overflow-hidden bg-white/20 border-2 border-white/40"
                >
                  <img
                    *ngIf="profile()?.avatar_url; else avatarPlaceholder"
                    [src]="profile()!.avatar_url"
                    [alt]="profile()?.full_name || 'Usuario'"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <ng-template #avatarPlaceholder>
                    <div class="h-full w-full flex items-center justify-center bg-white/30">
                      <svg class="h-7 w-7 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                  </ng-template>
                </div>

                <!-- Status Icon Badge -->
                <div
                  class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-accent-warm to-accent-petrol border-2 border-white flex items-center justify-center"
                >
                  <svg
                    *ngIf="verificationProgress() < 100"
                    class="h-3 w-3 text-beige-300 animate-pulse"
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
                  <svg
                    *ngIf="verificationProgress() === 100"
                    class="h-3 w-3 text-green-300"
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
                </div>
              </div>
            </div>

            <!-- Text Content -->
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold mb-1">
                {{ title() }}
              </h3>
              <p class="text-sm opacity-90 mb-3">
                {{ description() }}
              </p>

              <!-- Progress Bar (solo si no está completo) -->
              <div *ngIf="verificationProgress() < 100" class="mb-3">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span>Progreso de verificación</span>
                  <span class="font-semibold">{{ verificationProgress() }}%</span>
                </div>
                <div class="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    class="bg-white h-full rounded-full transition-all duration-500"
                    [style.width.%]="verificationProgress()"
                  ></div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap items-center gap-3">
                <a
                  routerLink="/profile"
                  [queryParams]="{ tab: 'verification' }"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-white text-accent-petrol rounded-lg text-sm font-semibold hover:bg-ivory-luminous transition-colors shadow-md hover:shadow-lg"
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

                <button
                  *ngIf="!isWelcome()"
                  type="button"
                  (click)="viewBenefits()"
                  class="inline-flex items-center gap-1 text-sm text-white/90 hover:text-white underline"
                >
                  ¿Por qué verificar mi identidad?
                </button>
              </div>
            </div>
          </div>

          <!-- Close Button -->
          <button
            type="button"
            (click)="dismiss()"
            class="flex-shrink-0 text-white/80 hover:text-white transition-colors"
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

    <!-- Benefits Modal (inline simple version) -->
    <div
      *ngIf="showBenefits()"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      (click)="closeBenefits()"
    >
      <div
        class="bg-white dark:bg-graphite-light rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start justify-between mb-4">
          <h2 class="text-2xl font-bold text-smoke-black dark:text-ivory-luminous">
            ¿Por qué verificar tu identidad?
          </h2>
          <button
            type="button"
            (click)="closeBenefits()"
            class="text-charcoal-medium dark:text-pearl-light hover:text-smoke-black dark:hover:text-white transition-colors"
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

        <div class="space-y-4 text-smoke-black dark:text-pearl-light">
          <div class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-green-600 dark:text-green-400"
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
              class="flex-shrink-0 w-10 h-10 bg-sky-100 dark:bg-sky-700/30 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-sky-600 dark:text-sky-400"
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
              class="flex-shrink-0 w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-sky-600 dark:text-sky-400"
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
                Usuarios verificados pueden publicar autos, solicitar retiros y acceder a beneficios
                exclusivos.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-10 h-10 bg-beige-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-5 h-5 text-beige-500 dark:text-beige-400"
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
            class="px-4 py-2 text-sm font-medium text-charcoal-medium dark:text-pearl-light hover:text-smoke-black dark:text-pearl-light dark:hover:text-white transition-colors"
          >
            Cerrar
          </button>
          <a
            routerLink="/profile"
            [queryParams]="{ tab: 'verification' }"
            (click)="closeBenefits()"
            class="px-4 py-2 bg-accent-petrol text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Iniciar verificación
          </a>
        </div>
      </div>
    </div>
  `,
})
export class VerificationPromptBannerComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly verificationService = inject(VerificationService);
  private readonly router = inject(Router);

  private readonly dismissed = signal(false);
  readonly showBenefits = signal(false);
  readonly profile = signal<UserProfile | null>(null);

  async ngOnInit(): Promise<void> {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('verification_banner_dismissed');
    if (dismissed) {
      this.dismissed.set(true);
      return;
    }

    // Load user profile
    await this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      const profile = await this.profileService.getCurrentProfile();
      this.profile.set(profile);
    } catch (__error) { /* Silenced */ }
  }

  /**
   * Calcula si el banner debe mostrarse
   */
  readonly shouldShow = computed(() => {
    const profile = this.profile();
    const dismissed = this.dismissed();

    if (!profile || dismissed) return false;

    // Mostrar si el usuario no está verificado
    const kyc = profile.kyc;
    return kyc === 'not_started' || kyc === 'pending' || kyc === 'rejected';
  });

  /**
   * Calcula el progreso de verificación (0-100)
   */
  readonly verificationProgress = computed(() => {
    const profile = this.profile();
    if (!profile) return 0;

    const kyc = profile.kyc;

    if (kyc === 'verified') return 100;
    if (kyc === 'pending') return 50;
    if (kyc === 'not_started') return 0;
    if (kyc === 'rejected') return 25; // Rechazado, necesita resubir

    return 0;
  });

  /**
   * Determina si es el mensaje de bienvenida (primera vez)
   */
  readonly isWelcome = computed(() => {
    const profile = this.profile();
    return profile?.kyc === 'not_started';
  });

  /**
   * Título del banner según el estado
   */
  readonly title = computed(() => {
    const kyc = this.profile()?.kyc;

    switch (kyc) {
      case 'not_started':
        return '👋 ¡Bienvenido a AutoRenta! Verificá tu identidad para comenzar';
      case 'pending':
        return '⏳ Verificación en proceso';
      case 'rejected':
        return '⚠️ Verificación rechazada - Se requiere acción';
      default:
        return 'Verificación pendiente';
    }
  });

  /**
   * Descripción del banner según el estado
   */
  readonly description = computed(() => {
    const kyc = this.profile()?.kyc;

    switch (kyc) {
      case 'not_started':
        return 'Verificá tu identidad en solo 5 minutos para publicar autos, reservar vehículos y acceder a todas las funciones de la plataforma.';
      case 'pending':
        return 'Estamos revisando tu documentación. Este proceso suele tomar entre 24 y 48 horas. Te notificaremos por email cuando esté lista.';
      case 'rejected':
        return 'Tu verificación fue rechazada. Por favor revisá los comentarios y volvé a subir la documentación correcta.';
      default:
        return 'Completá el proceso de verificación para acceder a todas las funcionalidades.';
    }
  });

  /**
   * Texto del botón CTA
   */
  readonly ctaButtonText = computed(() => {
    const kyc = this.profile()?.kyc;

    switch (kyc) {
      case 'not_started':
        return 'Verificar ahora';
      case 'pending':
        return 'Ver estado';
      case 'rejected':
        return 'Corregir documentos';
      default:
        return 'Ir a verificación';
    }
  });

  dismiss(): void {
    this.dismissed.set(true);

    // Guardar en localStorage para no mostrar en esta sesión
    sessionStorage.setItem('verification_banner_dismissed', Date.now().toString());
  }

  viewBenefits(): void {
    this.showBenefits.set(true);
  }

  closeBenefits(): void {
    this.showBenefits.set(false);
  }
}
