
import {Component, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReferralsService } from '../../core/services/referrals.service';

/**
 * Referral Landing Page
 *
 * Página que captura el código de referido cuando alguien hace click en un link compartido.
 * URL: /ref/:code
 *
 * Flow:
 * 1. Extrae el código de la URL
 * 2. Valida que el código existe y es válido
 * 3. Si no está autenticado: guarda el código en sessionStorage y redirige a registro
 * 4. Si está autenticado: aplica el código inmediatamente
 */
@Component({
  selector: 'app-referral-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gradient-to-br from-cta-default/5 via-surface-base to-cta-hover/5 dark:from-cyan-900/20 dark:via-slate-900 dark:to-cyan-800/20 py-16 px-4"
    >
      <div class="max-w-md w-full">
        @if (loading()) {
          <div class="card-premium p-8 text-center">
            <div
              class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cta-default dark:border-cyan-500 mb-4"
            ></div>
            <p class="text-text-secondary dark:text-gray-500">Validando código...</p>
          </div>
        } @else if (error()) {
          <div class="card-premium p-8 text-center">
            <div class="text-5xl mb-4">❌</div>
            <h2 class="text-2xl font-bold mb-2 text-text-primary dark:text-white">
              Código inválido
            </h2>
            <p class="text-text-secondary dark:text-gray-500 mb-6">
              {{ error() }}
            </p>
            <a routerLink="/" class="btn-primary"> Ir al inicio </a>
          </div>
        } @else if (success()) {
          <div class="card-premium p-8 text-center">
            <div class="text-5xl mb-4">🎉</div>
            <h2 class="text-2xl font-bold mb-2 text-text-primary dark:text-white">
              ¡Código aplicado!
            </h2>
            <p class="text-text-secondary dark:text-gray-500 mb-6">
              Recibiste <strong class="text-cta-default dark:text-cyan-400">$500 ARS</strong> de
              bono de bienvenida. ¡Publicá tu primer auto y ganá $1,000 ARS más!
            </p>
            <a routerLink="/cars/publish" class="btn-primary"> Publicar mi auto </a>
          </div>
        } @else {
          <div class="card-premium p-8">
            <div class="text-center mb-6">
              <div class="text-5xl mb-4">🎁</div>
              <h2 class="text-2xl font-bold mb-2 text-text-primary dark:text-white">
                ¡Te invitaron a Autorentar!
              </h2>
              <p class="text-text-secondary dark:text-gray-500">
                Usá el código
                <strong class="text-cta-default dark:text-cyan-400">{{ code() }}</strong> y ganás:
              </p>
            </div>

            <div
              class="bg-gradient-to-br from-cta-default/10 to-cta-hover/10 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-xl p-6 border border-cta-default/20 dark:border-cyan-500/20 mb-6"
            >
              <ul class="space-y-3">
                <li class="flex items-start gap-3">
                  <span class="text-2xl">💵</span>
                  <div>
                    <div class="font-semibold text-text-primary dark:text-white">
                      $500 ARS de bienvenida
                    </div>
                    <div class="text-sm text-text-secondary dark:text-gray-500">Al registrarte</div>
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-2xl">🚗</span>
                  <div>
                    <div class="font-semibold text-text-primary dark:text-white">
                      $1,000 ARS extras
                    </div>
                    <div class="text-sm text-text-secondary dark:text-gray-500">
                      Al publicar tu primer auto
                    </div>
                  </div>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-2xl">💰</span>
                  <div>
                    <div class="font-semibold text-text-primary dark:text-white">
                      Generá ingresos
                    </div>
                    <div class="text-sm text-text-secondary dark:text-gray-500">
                      Rentá tu auto y ganás hasta $200k/mes
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <button (click)="register()" class="btn-primary w-full mb-3">
              Registrarme y recibir bono
            </button>

            <div class="text-center text-sm text-text-muted dark:text-gray-500">
              ¿Ya tenés cuenta?
              <button (click)="login()" class="text-cta-default dark:text-cyan-400 hover:underline">
                Iniciá sesión
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ReferralLandingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly referralsService = inject(ReferralsService);
  private readonly authService = inject(AuthService);

  readonly code = signal<string>('');
  readonly loading = signal(false);
  readonly error = signal<string>('');
  readonly success = signal(false);

  async ngOnInit(): Promise<void> {
    // Extraer código de la URL
    const codeParam = this.route.snapshot.paramMap.get('code');
    if (!codeParam) {
      this.error.set('No se proporcionó un código de referido');
      return;
    }

    this.code.set(codeParam.toUpperCase());

    // Validar código
    this.loading.set(true);
    try {
      const isValid = await this.referralsService.validateReferralCode(this.code());

      if (!isValid) {
        this.error.set('El código de referido no es válido o ha expirado');
        return;
      }

      // Si ya está autenticado, aplicar código inmediatamente
      if (this.authService.isAuthenticated()) {
        await this.applyCode();
      } else {
        // Guardar código en sessionStorage para aplicarlo después del registro
        sessionStorage.setItem('referral_code', this.code());
      }
    } catch {
      this.error.set('Hubo un error al validar el código. Por favor, intentá de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  private async applyCode(): Promise<void> {
    try {
      await this.referralsService.applyReferralCode(this.code());
      this.success.set(true);

      // Redirigir a publicar auto después de 3 segundos
      setTimeout(() => {
        this.router.navigate(['/cars/publish']);
      }, 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      if (error.message?.includes('already referred')) {
        this.error.set('Ya usaste un código de referido anteriormente');
      } else {
        this.error.set('No pudimos aplicar el código. Intentá de nuevo más tarde.');
      }
    }
  }

  register(): void {
    // Redirigir a registro con el código guardado en sessionStorage
    this.router.navigate(['/auth/register'], {
      queryParams: { ref: this.code() },
    });
  }

  login(): void {
    // Redirigir a login
    this.router.navigate(['/auth/login'], {
      queryParams: { ref: this.code() },
    });
  }
}
