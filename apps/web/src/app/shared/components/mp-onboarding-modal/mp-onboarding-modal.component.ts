import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import {
  MarketplaceOnboardingService,
  MarketplaceStatus,
} from '../../../core/services/marketplace-onboarding.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Modal para onboarding de plataformas de pago
 *
 * Permite a los propietarios vincular sus cuentas de Mercado Pago y PayPal
 * para recibir pagos automáticamente vía split payments.
 *
 * Uso:
 * ```typescript
 * const modal = await this.modalCtrl.create({
 *   component: MpOnboardingModalComponent
 * });
 * await modal.present();
 * const { data } = await modal.onWillDismiss();
 * if (data?.completed) {
 *   // Onboarding completado
 * }
 * ```
 */
@Component({
  selector: 'app-mp-onboarding-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Conectar pagos</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()" [disabled]="loading()">
            <ion-icon name="close" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Preparando conexión...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading()" class="onboarding-content">
        <!-- Payment Methods Logos -->
        <div class="payment-logos-section">
          <div class="payment-logos">
            <!-- Mercado Pago -->
            <div class="payment-logo-item">
              <svg width="60" height="60" viewBox="0 0 80 80" fill="none">
                <rect width="80" height="80" rx="16" fill="#00B4E5"/>
                <path d="M20 20h40v40H20z" fill="white"/>
                <path d="M32 32h16v4H32v-4zm0 8h16v4H32v-4zm0 8h12v4H32v-4z" fill="#00B4E5"/>
              </svg>
              <span class="logo-label">Mercado Pago</span>
            </div>

            <!-- PayPal -->
            <div class="payment-logo-item">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <rect width="60" height="60" rx="12" fill="#0070BA"/>
                <path d="M8.5 15.5h12.5c6.5 0 11.5 5 11.5 11.5 0 6.5-5 11.5-11.5 11.5H14v7.5H8.5V15.5zm6.5 15h6c3.5 0 6-2.5 6-6s-2.5-6-6-6h-6v12z" fill="white"/>
                <path d="M35.5 15.5h12.5c6.5 0 11.5 5 11.5 11.5 0 6.5-5 11.5-11.5 11.5H41v7.5h-5.5V15.5zm6.5 15h6c3.5 0 6-2.5 6-6s-2.5-6-6-6h-6v12z" fill="white"/>
              </svg>
              <span class="logo-label">PayPal</span>
            </div>
          </div>

          <p class="logos-subtitle">Pagos seguros y confiables</p>
        </div>

        <!-- Main Message -->
        <div class="hero-section">
          <h1 class="hero-title">¡Conectá tus pagos y empezá a ganar!</h1>
          <p class="hero-subtitle">
            Recibí el dinero de tus alquileres directamente en Mercado Pago o PayPal. Miles de anfitriones ya lo hicieron.
          </p>
        </div>

        <!-- Key Benefit -->
        <div class="benefit-highlight">
          <div class="benefit-icon">
            <ion-icon name="cash" color="success"></ion-icon>
          </div>
          <div class="benefit-content">
            <h3 class="benefit-title">Dinero directo a tu cuenta</h3>
            <p class="benefit-description">
              Cuando alguien alquila tu auto, el pago llega automáticamente a tu Mercado Pago.
            </p>
          </div>
        </div>

        <!-- Trust Indicators -->
        <div class="trust-section">
          <div class="trust-item">
            <ion-icon name="shield-checkmark" color="success"></ion-icon>
            <span>100% Seguro</span>
          </div>
          <div class="trust-item">
            <ion-icon name="time" color="primary"></ion-icon>
            <span>Toma 30 segundos</span>
          </div>
          <div class="trust-item">
            <ion-icon name="refresh-circle" color="primary"></ion-icon>
            <span>Podés desconectar cuando quieras</span>
          </div>
        </div>

        <!-- Social Proof -->
        <div class="social-proof">
          <div class="social-proof-content">
            <div class="social-proof-icon">
              <ion-icon name="people" color="primary"></ion-icon>
            </div>
            <div class="social-proof-text">
              <p><strong>+2,000 anfitriones</strong> ya conectaron su cuenta</p>
            </div>
          </div>
        </div>

        <!-- Primary CTA -->
        <div class="cta-section">
          <ion-button
            expand="block"
            size="large"
            class="primary-cta"
            (click)="startOnboarding()"
            [disabled]="processing()"
          >
            <ion-icon slot="start" name="logo-mercadopago" *ngIf="!processing()"></ion-icon>
            <ion-spinner name="crescent" slot="start" *ngIf="processing()"></ion-spinner>
            <span class="cta-text">{{ processing() ? 'Conectando...' : 'Conectar pagos' }}</span>
          </ion-button>

          <p class="cta-disclaimer">
            Te redirigiremos a Mercado Pago o PayPal para autorizar la conexión de forma segura.
          </p>
        </div>

        <!-- Secondary Actions -->
        <div class="secondary-actions">
          <ion-button
            expand="block"
            fill="clear"
            size="small"
            (click)="refreshStatus()"
            [disabled]="processing() || loading()"
            class="secondary-btn"
          >
            <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
            Ya conecté mi cuenta
          </ion-button>
        </div>

        <!-- Minimal Terms -->
        <div class="terms-section">
          <p class="terms-text">
            Autorizás a AutoRenta a procesar pagos en tu nombre.
            <a href="/terms" target="_blank" class="terms-link">Ver términos</a>
          </p>
        </div>
      </div>

      <!-- Error State -->
      <ion-card *ngIf="error()" color="danger" class="error-card">
        <ion-card-content>
          <ion-icon name="alert-circle"></ion-icon>
          <div class="error-content">
            <strong>Error al vincular</strong>
            <p>{{ error() }}</p>
            <ion-button size="small" fill="clear" (click)="error.set(null)">
              Reintentar
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [
    `
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        gap: 1rem;

        ion-spinner {
          --color: var(--ion-color-primary);
          transform: scale(1.5);
        }

        p {
          color: var(--ion-color-medium);
          font-size: 0.9rem;
        }
      }

      .onboarding-content {
        max-width: 400px;
        margin: 0 auto;
        text-align: center;
      }

      .payment-logos-section {
        margin-bottom: 2rem;
      }

      .payment-logos {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 2rem;
        margin-bottom: 1rem;
      }

      .payment-logo-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .logo-label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--ion-color-dark);
        text-align: center;
      }

      .logos-subtitle {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        text-align: center;
        margin: 0;
        font-weight: 400;
      }

      .hero-section {
        margin-bottom: 2.5rem;
      }

      .hero-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--ion-color-dark);
        margin-bottom: 1rem;
        line-height: 1.3;
      }

      .hero-subtitle {
        font-size: 1rem;
        color: var(--ion-color-medium);
        line-height: 1.5;
      }

      .benefit-highlight {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 1px solid #0ea5e9;
        border-radius: 12px;
        padding: 1.25rem;
        margin-bottom: 2rem;
        text-align: left;
      }

      .benefit-icon {
        flex-shrink: 0;

        ion-icon {
          font-size: 32px;
          color: var(--ion-color-success);
        }
      }

      .benefit-content {
        flex: 1;
      }

      .benefit-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin-bottom: 0.5rem;
      }

      .benefit-description {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        line-height: 1.4;
        margin: 0;
      }

      .trust-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 2rem;
        gap: 0.5rem;
      }

      .trust-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        flex: 1;

        ion-icon {
          font-size: 24px;
          margin-bottom: 0.25rem;
        }

        span {
          font-size: 0.75rem;
          color: var(--ion-color-medium);
          text-align: center;
          line-height: 1.3;
          font-weight: 500;
        }
      }

      .social-proof {
        margin-bottom: 2.5rem;
      }

      .social-proof-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        background: rgba(59, 130, 246, 0.05);
        border: 1px solid rgba(59, 130, 246, 0.1);
        border-radius: 8px;
        padding: 0.75rem;
      }

      .social-proof-icon {
        ion-icon {
          font-size: 20px;
          color: var(--ion-color-primary);
        }
      }

      .social-proof-text {
        p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--ion-color-primary);
          font-weight: 500;
        }
      }

      .cta-section {
        margin-bottom: 2rem;
      }

      .primary-cta {
        --border-radius: 12px;
        --background: linear-gradient(135deg, #00B4E5 0%, #0099CC 100%);
        --background-activated: linear-gradient(135deg, #0099CC 0%, #0088B8 100%);
        --color: white;
        font-weight: 600;
        font-size: 1.1rem;
        min-height: 56px;
        box-shadow: 0 4px 14px rgba(0, 180, 229, 0.3);
        margin-bottom: 1rem;

        .cta-text {
          font-weight: 600;
        }
      }

      .cta-disclaimer {
        font-size: 0.8rem;
        color: var(--ion-color-medium);
        text-align: center;
        margin: 0;
        line-height: 1.4;
      }

      .secondary-actions {
        margin-bottom: 2rem;
      }

      .secondary-btn {
        --color: var(--ion-color-primary);
        font-size: 0.9rem;
      }

      .terms-section {
        text-align: center;
      }

      .terms-text {
        font-size: 0.8rem;
        color: var(--ion-color-medium);
        line-height: 1.4;
        margin: 0;

        .terms-link {
          color: var(--ion-color-primary);
          text-decoration: underline;
        }
      }

      .error-card {
        margin-top: 1rem;

        ion-card-content {
          display: flex;
          gap: 0.75rem;

          ion-icon {
            font-size: 28px;
            flex-shrink: 0;
          }

          .error-content {
            flex: 1;

            strong {
              display: block;
              margin-bottom: 0.5rem;
            }

            p {
              margin: 0 0 0.75rem;
              font-size: 0.9rem;
            }
          }
        }
      }

      @media (max-width: 480px) {
        .onboarding-content {
          max-width: 100%;
        }

        .payment-logos {
          flex-direction: column;
          gap: 1.5rem;
        }

        .hero-title {
          font-size: 1.3rem;
        }

        .benefit-highlight {
          padding: 1rem;
        }

        .trust-section {
          flex-direction: column;
          gap: 1rem;
        }

        .trust-item {
          flex-direction: row;
          justify-content: center;
          gap: 0.5rem;

          ion-icon {
            font-size: 20px;
            margin-bottom: 0;
          }

          span {
            text-align: left;
            font-size: 0.8rem;
          }
        }
      }
    `,
  ],
})
export class MpOnboardingModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly onboardingService = inject(MarketplaceOnboardingService);
  private readonly authService = inject(AuthService);

  loading = signal(true);
  processing = signal(false);
  error = signal<string | null>(null);
  status = signal<MarketplaceStatus | null>(null);

  async ngOnInit() {
    await this.loadStatus();
  }

  private async loadStatus(autoDismiss = true) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const user = await this.authService.getCurrentUser();
      if (!user) {
        this.error.set('Usuario no autenticado');
        this.loading.set(false);
        return;
      }

      const status = await this.onboardingService.getMarketplaceStatus(user.id);
      this.status.set(status);

      // Si ya está aprobado, cerrar modal
      if (autoDismiss && status.isApproved) {
        await this.dismiss({ completed: true, alreadyLinked: true });
        return;
      }
    } catch (_err) {
      this.error.set('Error al cargar estado');
    } finally {
      this.loading.set(false);
    }
  }

  async refreshStatus() {
    await this.loadStatus(false);
  }

  async startOnboarding() {
    this.processing.set(true);
    this.error.set(null);

    try {
      const user = await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Iniciar OAuth flow
      const authUrl = await this.onboardingService.startOnboarding(user.id);

      // Redirigir a Mercado Pago
      window.location.href = authUrl;

      // El usuario será redirigido de vuelta a /mp-callback
    } catch (err) {
      this.error.set(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar la vinculación. Intentá nuevamente.',
      );
      this.processing.set(false);
    }
  }

  async dismiss(data?: unknown) {
    await this.modalCtrl.dismiss(data);
  }
}
