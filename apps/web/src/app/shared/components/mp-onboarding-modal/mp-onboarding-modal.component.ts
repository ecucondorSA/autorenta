import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import {
  MarketplaceOnboardingService,
  MarketplaceStatus,
} from '../../../core/services/marketplace-onboarding.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Modal para onboarding de Mercado Pago Marketplace
 *
 * Permite a los propietarios vincular su cuenta de Mercado Pago
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
        <ion-title>Vinculá tu Mercado Pago</ion-title>
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
        <p>Preparando vinculación...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading()" class="onboarding-content">
        <!-- Header Icon -->
        <div class="header-icon">
          <ion-icon name="wallet" color="primary"></ion-icon>
        </div>

        <!-- Title -->
        <h2 class="modal-title">Recibí pagos automáticamente</h2>

        <!-- Description -->
        <p class="description">
          Para listar tu auto y recibir alquileres, necesitás vincular tu cuenta de Mercado Pago.
          Así recibirás el dinero directamente en tu cuenta al finalizar cada reserva.
        </p>

        <!-- Benefits List -->
        <div class="benefits-section">
          <h3 class="section-title">✨ Beneficios</h3>

          <div class="benefit-item">
            <ion-icon name="flash" color="success"></ion-icon>
            <div class="benefit-text">
              <strong>Pagos instantáneos</strong>
              <span>Recibís el dinero automáticamente cuando termina el alquiler</span>
            </div>
          </div>

          <div class="benefit-item">
            <ion-icon name="shield-checkmark" color="success"></ion-icon>
            <div class="benefit-text">
              <strong>Seguro y protegido</strong>
              <span>Mercado Pago garantiza la protección de todas las transacciones</span>
            </div>
          </div>

          <div class="benefit-item">
            <ion-icon name="cash" color="success"></ion-icon>
            <div class="benefit-text">
              <strong>Transparente</strong>
              <span>Ves exactamente cuánto vas a recibir antes de cada alquiler</span>
            </div>
          </div>

          <div class="benefit-item">
            <ion-icon name="trending-up" color="success"></ion-icon>
            <div class="benefit-text">
              <strong>Sin comisiones ocultas</strong>
              <span>Autorentar retiene solo 15% + fees de Mercado Pago</span>
            </div>
          </div>
        </div>

        <!-- How it Works -->
        <div class="how-it-works">
          <h3 class="section-title">📋 ¿Cómo funciona?</h3>

          <div class="step-item">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>Vinculás tu cuenta</strong>
              <span>Autorizás a Autorentar para procesar pagos</span>
            </div>
          </div>

          <div class="step-item">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>Listás tu auto</strong>
              <span>Publicás tu vehículo con precio y disponibilidad</span>
            </div>
          </div>

          <div class="step-item">
            <div class="step-number">3</div>
            <div class="step-content">
              <strong>Recibís pagos automáticamente</strong>
              <span>Cuando alguien alquila, el dinero llega a tu cuenta MP</span>
            </div>
          </div>
        </div>

        <!-- Warning Box -->
        <ion-card class="warning-box" color="warning">
          <ion-card-content>
            <ion-icon name="information-circle" slot="start"></ion-icon>
            <div class="warning-text">
              <strong>Necesitás tener una cuenta de Mercado Pago</strong>
              <p>
                Si no tenés, podés crearla gratis en
                <a href="https://www.mercadopago.com.ar" target="_blank">mercadopago.com.ar</a>
              </p>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <ion-button
            expand="block"
            size="large"
            (click)="startOnboarding()"
            [disabled]="processing()"
          >
            <ion-icon slot="start" name="logo-mercadopago" *ngIf="!processing()"></ion-icon>
            <ion-spinner name="crescent" slot="start" *ngIf="processing()"></ion-spinner>
            {{ processing() ? 'Conectando...' : 'Vincular Mercado Pago' }}
          </ion-button>

          <ion-button expand="block" fill="clear" (click)="dismiss()" [disabled]="processing()">
            Ahora no
          </ion-button>
        </div>

        <!-- Terms -->
        <ion-note color="medium" class="terms">
          Al vincular tu cuenta, autorizás a Autorentar a procesar pagos en tu nombre. Podés
          desvincular tu cuenta en cualquier momento desde tu perfil.
          <a href="/terms" target="_blank">Ver términos completos</a>
        </ion-note>
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
        max-width: 600px;
        margin: 0 auto;
      }

      .header-icon {
        text-align: center;
        margin-bottom: 1.5rem;

        ion-icon {
          font-size: 80px;
        }
      }

      .modal-title {
        font-size: 1.75rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 1rem;
        color: var(--ion-color-dark);
      }

      .description {
        text-align: center;
        color: var(--ion-color-medium);
        line-height: 1.6;
        margin-bottom: 2rem;
        font-size: 1rem;
      }

      .benefits-section,
      .how-it-works {
        margin-bottom: 2rem;
      }

      .section-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: var(--ion-color-dark);
      }

      .benefit-item {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.25rem;
        align-items: flex-start;

        ion-icon {
          font-size: 28px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .benefit-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          strong {
            color: var(--ion-color-dark);
            font-size: 0.95rem;
          }

          span {
            color: var(--ion-color-medium);
            font-size: 0.85rem;
            line-height: 1.4;
          }
        }
      }

      .step-item {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.25rem;
        align-items: flex-start;

        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--ion-color-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding-top: 2px;

          strong {
            color: var(--ion-color-dark);
            font-size: 0.95rem;
          }

          span {
            color: var(--ion-color-medium);
            font-size: 0.85rem;
          }
        }
      }

      .warning-box {
        margin: 1.5rem 0;

        ion-card-content {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;

          ion-icon {
            font-size: 24px;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .warning-text {
            flex: 1;

            strong {
              display: block;
              margin-bottom: 0.5rem;
              font-size: 0.9rem;
            }

            p {
              margin: 0;
              font-size: 0.85rem;
              line-height: 1.4;

              a {
                color: var(--ion-color-primary);
                text-decoration: underline;
              }
            }
          }
        }
      }

      .action-buttons {
        margin: 2rem 0 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        ion-button[expand='block'] {
          --border-radius: 12px;
          font-weight: 600;
        }
      }

      .terms {
        display: block;
        text-align: center;
        font-size: 0.75rem;
        line-height: 1.5;
        margin-top: 1rem;
        padding: 0 1rem;

        a {
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

      @media (max-width: 576px) {
        .modal-title {
          font-size: 1.5rem;
        }

        .header-icon ion-icon {
          font-size: 64px;
        }

        .benefit-item ion-icon {
          font-size: 24px;
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

  private async loadStatus() {
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
      if (status.isApproved) {
        await this.dismiss({ completed: true, alreadyLinked: true });
        return;
      }
    } catch (err) {
      console.error('Error loading status:', err);
      this.error.set('Error al cargar estado');
    } finally {
      this.loading.set(false);
    }
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
      console.error('Error starting onboarding:', err);
      this.error.set(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar la vinculación. Intentá nuevamente.',
      );
      this.processing.set(false);
    }
  }

  async dismiss(data?: any) {
    await this.modalCtrl.dismiss(data);
  }
}
