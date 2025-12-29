import { LoggerService } from '@core/services/infrastructure/logger.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { TikTokEventsService } from '@core/services/infrastructure/tiktok-events.service';
import {Component, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { ProfileService } from '@core/services/auth/profile.service';
import { environment } from '@environment';

/**
 * AuthCallbackPage
 *
 * Página de callback para autenticación OAuth (Google, TikTok, etc.)
 * Maneja el retorno desde el proveedor OAuth y redirige al usuario
 *
 * Flujos soportados:
 * 1. Google OAuth:
 *    - Usuario clickea "Continuar con Google" → Redirige a Google
 *    - Google redirige a /auth/callback con #access_token=...
 *    - Esta página procesa el callback → Extrae sesión de Supabase
 *
 * 2. TikTok OAuth:
 *    - Usuario clickea "Continuar con TikTok" → Redirige a TikTok
 *    - TikTok redirige a /auth/callback?code=...
 *    - Esta página detecta código TikTok y llama handleTikTokCallback
 *    - Edge Function intercambia código por sesión
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-auth-callback-page',
  imports: [NgOptimizedImage],
  template: `
    <div
      class="min-h-screen bg-surface-base dark:bg-surface-base flex items-center justify-center py-12 px-4"
      >
      <div class="w-full max-w-md text-center">
        <!-- Loading State -->
        @if (!error()) {
          <div class="space-y-6">
            <div class="h-16 flex items-center justify-center mb-4">
              <img
                ngSrc="/assets/images/autorentar-logo.png"
                alt="Autorentar"
                width="500"
                height="500"
                priority
                class="h-full w-auto object-contain scale-[2]"
                />
            </div>
            <div class="flex justify-center">
              <svg
                class="animate-spin h-12 w-12 text-cta-default"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
                >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <div class="space-y-2">
              <h1 class="text-2xl font-bold text-text-primary dark:text-text-primary">
                Completando inicio de sesión...
              </h1>
              <p class="text-text-secondary dark:text-text-secondary">
                Por favor esperá mientras procesamos tu autenticación
              </p>
            </div>
          </div>
        }
    
        <!-- Error State -->
        @if (error()) {
          <div class="space-y-6">
            <div
              class="bg-error-bg dark:bg-error-900/20 border-2 border-error-border dark:border-error-800 rounded-lg p-6"
              >
              <h2 class="text-xl font-bold text-error-strong mb-2">Error de autenticación</h2>
              <p class="text-error-text mb-4">
                {{ error() }}
              </p>
              <button
                (click)="redirectToLogin()"
                class="rounded-lg bg-cta-default text-cta-text hover:opacity-90 transition-all shadow-md"
                >
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        }
      </div>
    </div>
    `,
})
export class AuthCallbackPage implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly analytics = inject(AnalyticsService);
  private readonly tiktokEvents = inject(TikTokEventsService);

  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      // Verificar si hay errores en la URL (query params)
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (errorParam) {
        // Error de OAuth (ej: bad_oauth_state)
        let errorMessage = 'Error durante la autenticación.';

        if (errorParam === 'bad_oauth_state') {
          errorMessage =
            'La sesión de autenticación expiró o se perdió. Por favor intentá iniciar sesión nuevamente.';
        } else if (errorDescription) {
          errorMessage = decodeURIComponent(errorDescription);
        }

        // Limpiar la URL
        window.history.replaceState({}, document.title, window.location.pathname);

        throw new Error(errorMessage);
      }

      // Detectar si es callback de TikTok (tiene parámetro ?code=...)
      const tiktokCode = urlParams.get('code');
      let sessionResult: { error: Error | null } | null = null;

      if (tiktokCode) {
        // Procesar callback de TikTok
        this.logger.debug('🎵 Detectado callback de TikTok');
        sessionResult = await this.auth.handleTikTokCallback(tiktokCode);
      } else {
        // Procesar tokens del hash de OAuth (Google, etc.)
        // Supabase Auth detecta automáticamente tokens en URL fragments (#access_token=...)
        sessionResult = await this.auth.handleOAuthCallback();
      }

      const { error } = sessionResult;

      if (error) {
        // Manejar errores específicos de Supabase
        if (error.message?.includes('bad_oauth_state') || error.message?.includes('state')) {
          throw new Error(
            'La sesión de autenticación expiró. Por favor intentá iniciar sesión nuevamente.',
          );
        }
        throw new Error(error.message || 'Error durante la autenticación.');
      }

      // Esperar a que la sesión esté disponible
      await this.auth.ensureSession();

      // Pequeño delay para asegurar que la sesión esté completamente procesada
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verificar si el usuario está autenticado
      if (this.auth.isAuthenticated()) {
        // Detectar provider (TikTok o Google)
        const provider = tiktokCode ? 'tiktok' : 'google';

        // Verificar si necesita completar onboarding
        try {
          const hasCompletedOnboarding = await this.profileService.hasCompletedOnboarding();
          const isNewUser = !hasCompletedOnboarding;

          // Track auth completion
          if (isNewUser) {
            // Usuario nuevo - track sign_up
            this.analytics.trackEvent('sign_up', {
              method: provider,
              source: 'oauth_callback',
              step: 'completed',
            });

            // TikTok pixel
            void this.tiktokEvents.trackCompleteRegistration({
              value: 0,
              currency: environment.defaultCurrency,
            });

            // Usuario nuevo - ir al onboarding
            await this.router.navigate(['/onboarding']);
          } else {
            // Usuario existente - track login
            this.analytics.trackEvent('login', {
              method: provider,
              source: 'oauth_callback',
              step: 'completed',
            });

            // Usuario existente - ir a lista de autos
            await this.router.navigate(['/cars/list']);
          }
        } catch (onboardingError) {
          // Si hay error verificando onboarding, ir a lista de autos (fail-open)
          console.warn('Error verificando onboarding:', onboardingError);
          await this.router.navigate(['/cars/list']);
        }
      } else {
        throw new Error('No se pudo completar la autenticación. Intentá nuevamente.');
      }
    } catch (err) {
      this.error.set(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error durante la autenticación. Por favor intentá nuevamente.',
      );
    }
  }

  async redirectToLogin(): Promise<void> {
    await this.router.navigate(['/auth/login']);
  }
}
