
import {Component, OnDestroy, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { MarketplaceOnboardingService } from '@core/services/auth/marketplace-onboarding.service';

/**
 * Página de callback para OAuth de Mercado Pago
 *
 * Mercado Pago redirige aquí después de la autorización:
 * /mp-callback?code=xxx&state=yyy
 *
 * Esta página:
 * 1. Obtiene code y state de los query params
 * 2. Llama al servicio para completar el onboarding
 * 3. Redirige al usuario a su perfil o cars/new
 */
@Component({
  selector: 'app-mp-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, RouterModule],
  template: `
    <ion-content class="ion-padding">
      <div class="callback-container">
        <!-- Processing State -->
        @if (state() === 'processing') {
          <div class="state-card">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <h2>Vinculando tu cuenta...</h2>
            <p>Por favor esperá un momento mientras completamos la vinculación con Mercado Pago.</p>
          </div>
        }
    
        <!-- Success State -->
        @if (state() === 'success') {
          <div class="state-card success">
            <ion-icon name="checkmark-circle" color="success"></ion-icon>
            <h2>¡Listo! Cuenta vinculada</h2>
            <p>Ya podés listar tu auto y empezar a recibir pagos automáticamente.</p>
            <div class="next-steps">
              <h3>Próximos pasos:</h3>
              <ol>
                <li>Publicá tu vehículo con fotos y descripción</li>
                <li>Configurá precio y disponibilidad</li>
                <li>¡Recibí tu primer alquiler!</li>
              </ol>
            </div>
            <ion-button expand="block" size="large" [routerLink]="['/cars/new']">
              <ion-icon slot="start" name="car"></ion-icon>
              Listar Mi Auto
            </ion-button>
            <ion-button expand="block" fill="clear" [routerLink]="['/profile']">
              Ir a Mi Perfil
            </ion-button>
            <div class="auto-redirect-note">
              <ion-icon name="information-circle"></ion-icon>
              Serás redirigido automáticamente en {{ countdown() }} segundos...
            </div>
          </div>
        }
    
        <!-- Error State -->
        @if (state() === 'error') {
          <div class="state-card error">
            <ion-icon name="close-circle" color="danger"></ion-icon>
            <h2>No se pudo vincular la cuenta</h2>
            <p class="error-message">{{ errorMessage() }}</p>
            <ion-card color="warning">
              <ion-card-content>
                <ion-icon name="help-circle"></ion-icon>
                <div class="help-text">
                  <strong>¿Qué puede haber salido mal?</strong>
                  <ul>
                    <li>Cancelaste la autorización en Mercado Pago</li>
                    <li>El enlace de autorización expiró (dura 10 minutos)</li>
                    <li>Hubo un problema de conexión</li>
                    <li>Ya vinculaste esta cuenta anteriormente</li>
                  </ul>
                </div>
              </ion-card-content>
            </ion-card>
            <ion-button expand="block" size="large" (click)="retry()">
              <ion-icon slot="start" name="refresh"></ion-icon>
              Intentar Nuevamente
            </ion-button>
            <ion-button expand="block" fill="clear" [routerLink]="['/profile']">
              Volver a Mi Perfil
            </ion-button>
          </div>
        }
    
        <!-- Loading State (initial) -->
        @if (state() === 'loading') {
          <div class="state-card">
            <ion-spinner name="dots" color="primary"></ion-spinner>
            <p>Cargando...</p>
          </div>
        }
      </div>
    </ion-content>
    `,
  styles: [
    `
      :host {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        contain: layout size style;
      }

      .callback-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 80vh;
        padding: 2rem;
      }

      .state-card {
        max-width: 600px;
        width: 100%;
        text-align: center;
        background: var(--ion-color-light);
        border-radius: 16px;
        padding: 3rem 2rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

        ion-spinner {
          margin-bottom: 2rem;
          transform: scale(1.5);
        }

        ion-icon:not([slot]) {
          font-size: 80px;
          margin-bottom: 1.5rem;
        }

        h2 {
          font-size: 1.75rem;
          font-weight: bold;
          margin-bottom: 1rem;
          color: var(--ion-color-dark);
        }

        p {
          color: var(--ion-color-medium);
          line-height: 1.6;
          margin-bottom: 2rem;
          font-size: 1rem;
        }

        &.success {
          border: 3px solid var(--ion-color-success);
        }

        &.error {
          border: 3px solid var(--ion-color-danger);

          .error-message {
            color: var(--ion-color-danger);
            font-weight: 500;
            background: var(--ion-color-danger-tint);
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
          }
        }
      }

      .next-steps {
        text-align: left;
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 2rem;

        h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--ion-color-dark);
        }

        ol {
          margin: 0;
          padding-left: 1.5rem;

          li {
            margin-bottom: 0.75rem;
            color: var(--ion-color-medium);
            line-height: 1.5;

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }

      ion-card {
        text-align: left;
        margin-bottom: 1.5rem;

        ion-card-content {
          display: flex;
          gap: 1rem;
          align-items: flex-start;

          ion-icon {
            font-size: 32px;
            flex-shrink: 0;
            margin-top: 0;
          }

          .help-text {
            flex: 1;

            strong {
              display: block;
              margin-bottom: 0.75rem;
              font-size: 0.95rem;
            }

            ul {
              margin: 0;
              padding-left: 1.25rem;

              li {
                margin-bottom: 0.5rem;
                font-size: 0.85rem;
                line-height: 1.4;

                &:last-child {
                  margin-bottom: 0;
                }
              }
            }
          }
        }
      }

      ion-button {
        --border-radius: 12px;
        margin-bottom: 0.75rem;

        &:last-of-type {
          margin-bottom: 0;
        }
      }

      .auto-redirect-note {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 2rem;
        padding: 1rem;
        background: rgba(var(--ion-color-primary-rgb), 0.1);
        border-radius: 8px;
        font-size: 0.85rem;
        color: var(--ion-color-medium);

        ion-icon {
          font-size: 20px;
          margin: 0;
        }
      }

      @media (max-width: 576px) {
        .callback-container {
          padding: 1rem;
        }

        .state-card {
          padding: 2rem 1.5rem;

          h2 {
            font-size: 1.5rem;
          }

          ion-icon:not([slot]) {
            font-size: 64px;
          }
        }
      }
    `,
  ],
})
export class MpCallbackPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly onboardingService = inject(MarketplaceOnboardingService);

  state = signal<'loading' | 'processing' | 'success' | 'error'>('loading');
  errorMessage = signal<string>('');
  countdown = signal<number>(5);
  private countdownInterval?: number;

  async ngOnInit() {
    // Obtener parámetros de query
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const error = this.route.snapshot.queryParamMap.get('error');
    const errorDescription = this.route.snapshot.queryParamMap.get('error_description');

    // Si hay error de MP
    if (error) {
      this.handleError(errorDescription || error);
      return;
    }

    // Validar parámetros requeridos
    if (!code || !state) {
      this.handleError(
        'Faltan parámetros de autorización. Por favor, intentá vincular tu cuenta nuevamente.',
      );
      return;
    }

    // Procesar callback
    await this.processCallback(code, state);
  }

  private async processCallback(code: string, state: string) {
    this.state.set('processing');

    try {
      // Completar onboarding
      await this.onboardingService.handleCallback(code, state);

      // Mostrar success
      this.state.set('success');

      // Iniciar countdown para redirect automático
      this.startCountdown();
    } catch (_error) {
      this.handleError(
        _error instanceof Error
          ? _error.message
          : 'Ocurrió un error al procesar la autorización. Por favor, intentá nuevamente.',
      );
    }
  }

  private handleError(message: string) {
    this.state.set('error');
    this.errorMessage.set(message);
  }

  private startCountdown() {
    this.countdownInterval = window.setInterval(() => {
      const current = this.countdown();
      if (current <= 1) {
        this.stopCountdown();
        this.router.navigate(['/cars/new']);
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }

  retry() {
    // Redirigir a perfil o donde sea que esté el botón de vincular MP
    this.router.navigate(['/profile'], {
      queryParams: { action: 'link_mp' },
    });
  }

  ngOnDestroy() {
    this.stopCountdown();
  }
}
