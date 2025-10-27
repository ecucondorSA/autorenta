import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * AuthCallbackPage
 *
 * Página de callback para autenticación OAuth (Google, etc.)
 * Maneja el retorno desde el proveedor OAuth y redirige al usuario
 *
 * Flujo:
 * 1. Usuario clickea "Continuar con Google" → Redirige a Google
 * 2. Usuario autoriza en Google → Google redirige a /auth/callback
 * 3. Esta página procesa el callback → Extrae sesión de Supabase
 * 4. Redirige al usuario a la página principal
 */
@Component({
  standalone: true,
  selector: 'app-auth-callback-page',
  imports: [CommonModule, NgOptimizedImage],
  template: `
    <div
      class="min-h-screen bg-ivory-soft dark:bg-graphite-dark flex items-center justify-center py-12 px-4"
    >
      <div class="w-full max-w-md text-center">
        <!-- Loading State -->
        <div *ngIf="!error()" class="space-y-6">
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
              class="animate-spin h-12 w-12 text-accent-petrol"
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
            <h1 class="text-2xl font-bold text-smoke-black dark:text-ivory-luminous">
              Completando inicio de sesión...
            </h1>
            <p class="text-charcoal-medium dark:text-pearl-light">
              Por favor esperá mientras procesamos tu autenticación
            </p>
          </div>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="space-y-6">
          <div
            class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6"
          >
            <h2 class="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
              Error de autenticación
            </h2>
            <p class="text-red-600 dark:text-red-300 mb-4">
              {{ error() }}
            </p>
            <button
              (click)="redirectToLogin()"
              class="rounded-lg bg-accent-petrol px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-md"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      // Procesar tokens del hash de OAuth
      // Supabase Auth detecta automáticamente tokens en URL fragments (#access_token=...)
      const { error } = await this.auth.handleOAuthCallback();

      if (error) {
        throw new Error(error.message);
      }

      // Esperar a que la sesión esté disponible
      await this.auth.ensureSession();

      // Pequeño delay para asegurar que la sesión esté completamente procesada
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verificar si el usuario está autenticado
      if (this.auth.isAuthenticated()) {
        console.log('✅ OAuth login successful, redirecting to home...');
        // Redirigir a la página principal
        await this.router.navigate(['/']);
      } else {
        throw new Error('No se pudo completar la autenticación. Intentá nuevamente.');
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
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
