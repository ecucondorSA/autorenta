import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ProtectionCreditService } from '../../../core/services/protection-credit.service';

/**
 * ProtectionCreditCardComponent
 *
 * Tarjeta que muestra el Crédito de Protección (CP) del usuario.
 *
 * MUESTRA:
 * - Balance actual de CP (no retirable)
 * - Fecha de expiración y días restantes
 * - Porcentaje de CP usado
 * - Progreso hacia renovación gratuita (10 bookings sin siniestros)
 * - Botón de información sobre el CP
 *
 * ESTADOS:
 * - ✅ Activo: Balance > 0, no expirado
 * - ⚠️ Próximo a expirar: < 30 días restantes
 * - ❌ Expirado: Días restantes < 0
 * - ➖ Sin CP: Balance = 0
 */

@Component({
  selector: 'app-protection-credit-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="shield-checkmark-outline"></ion-icon>
          Crédito de Protección
        </ion-card-title>
        <ion-card-subtitle>
          Balance no retirable para siniestros
        </ion-card-subtitle>
      </ion-card-header>

      <ion-card-content>
        <!-- Loading State -->
        <div *ngIf="protectionCreditService.loading()" class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Cargando balance...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="protectionCreditService.error()" class="error-container">
          <ion-icon name="alert-circle-outline" color="danger"></ion-icon>
          <p>{{ protectionCreditService.error() }}</p>
        </div>

        <!-- Balance Loaded -->
        <div *ngIf="!protectionCreditService.loading() && !protectionCreditService.error() && balance()">
          <!-- Balance Display -->
          <div class="balance-section">
            <div class="balance-header">
              <span class="balance-label">Balance Actual</span>
              <ion-badge [color]="statusBadgeColor()">
                {{ statusIcon() }}
              </ion-badge>
            </div>
            <div class="balance-amount">
              <span class="amount">{{ formattedBalance() }}</span>
            </div>
          </div>

          <!-- Usage Bar -->
          <div class="usage-section" *ngIf="hasBalance()">
            <div class="usage-header">
              <span class="usage-label">CP Usado</span>
              <span class="usage-percentage">{{ usagePercentage() }}%</span>
            </div>
            <ion-progress-bar
              [value]="usagePercentage() / 100"
              [color]="usagePercentage() > 75 ? 'danger' : usagePercentage() > 50 ? 'warning' : 'success'"
            ></ion-progress-bar>
            <p class="usage-message">
              {{ 100 - usagePercentage() }}% disponible para siniestros
            </p>
          </div>

          <!-- Expiration Info -->
          <div class="expiration-section" *ngIf="hasBalance() && !isExpired()">
            <div class="expiration-item">
              <ion-icon name="calendar-outline" color="medium"></ion-icon>
              <div class="expiration-content">
                <span class="expiration-label">Expira el</span>
                <span class="expiration-value">{{ formattedExpiry() }}</span>
              </div>
            </div>
            <div class="expiration-item" *ngIf="daysUntilExpiry() !== null">
              <ion-icon
                name="time-outline"
                [color]="isNearExpiry() ? 'warning' : 'medium'"
              ></ion-icon>
              <div class="expiration-content">
                <span class="expiration-label">Tiempo restante</span>
                <span
                  class="expiration-value"
                  [class.warning]="isNearExpiry()"
                >
                  {{ daysRemainingText() }}
                </span>
              </div>
            </div>
          </div>

          <!-- Expired Warning -->
          <ion-card class="warning-card" *ngIf="isExpired()">
            <ion-card-content>
              <div class="warning-content">
                <ion-icon name="alert-circle-outline" color="danger"></ion-icon>
                <p>Tu Crédito de Protección ha expirado.</p>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Renewal Progress -->
          <div class="renewal-section">
            <h3>Renovación Gratuita</h3>
            <p class="renewal-description">
              Completa 10 bookings sin siniestros para renovar gratis tu CP ($300 USD).
            </p>

            <div class="renewal-progress" *ngIf="renewalProgress()">
              <div class="progress-header">
                <span class="progress-label">Progreso</span>
                <span class="progress-value">{{ renewalProgress()!.progress }}%</span>
              </div>
              <ion-progress-bar
                [value]="renewalProgress()!.progress / 100"
                [color]="renewalProgress()!.eligible ? 'success' : 'primary'"
              ></ion-progress-bar>
              <p class="progress-message" [class.eligible]="renewalProgress()!.eligible">
                <ion-icon
                  [name]="renewalProgress()!.eligible ? 'checkmark-circle-outline' : 'information-circle-outline'"
                  [color]="renewalProgress()!.eligible ? 'success' : 'medium'"
                ></ion-icon>
                {{ renewalProgress()!.message }}
              </p>
            </div>
          </div>

          <!-- Info Message -->
          <ion-card class="info-card">
            <ion-card-content>
              <div class="info-content">
                <ion-icon name="information-circle-outline" color="primary"></ion-icon>
                <p>{{ infoMessage() }}</p>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Learn More Button -->
          <ion-button expand="block" fill="outline" (click)="onLearnMore()">
            <ion-icon slot="start" name="help-circle-outline"></ion-icon>
            ¿Cómo funciona el CP?
          </ion-button>
        </div>

        <!-- No Balance State -->
        <div *ngIf="!protectionCreditService.loading() && !balance()" class="no-balance">
          <ion-icon name="shield-outline" color="medium"></ion-icon>
          <p>No tienes Crédito de Protección disponible.</p>
          <p class="no-balance-hint">
            Completa 10 bookings sin siniestros para obtener $300 USD de crédito gratis.
          </p>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      ion-card {
        margin: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      ion-card-header {
        border-bottom: 1px solid var(--ion-color-light);
      }

      ion-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.2rem;
        font-weight: 600;
      }

      ion-card-subtitle {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin-top: 4px;
      }

      /* Loading and Error States */
      .loading-container,
      .error-container,
      .no-balance {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px;
        text-align: center;
      }

      .loading-container ion-spinner {
        margin-bottom: 16px;
      }

      .error-container ion-icon,
      .no-balance ion-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .no-balance-hint {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        margin-top: 8px;
      }

      /* Balance Section */
      .balance-section {
        margin-bottom: 24px;
        padding: 20px;
        background: linear-gradient(135deg, var(--ion-color-primary-tint), var(--ion-color-secondary-tint));
        border-radius: 12px;
      }

      .balance-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .balance-label {
        font-size: 0.9rem;
        color: var(--ion-color-dark);
        font-weight: 500;
      }

      .balance-amount {
        text-align: center;
      }

      .amount {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--ion-color-dark);
      }

      /* Usage Section */
      .usage-section {
        margin-bottom: 24px;
        padding: 16px;
        background: var(--ion-color-light);
        border-radius: 8px;
      }

      .usage-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .usage-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--ion-color-dark);
      }

      .usage-percentage {
        font-size: 1rem;
        font-weight: 700;
        color: var(--ion-color-medium);
      }

      ion-progress-bar {
        height: 8px;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      .usage-message {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin: 0;
        text-align: center;
      }

      /* Expiration Section */
      .expiration-section {
        margin-bottom: 24px;
      }

      .expiration-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--ion-color-light);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .expiration-item ion-icon {
        font-size: 24px;
      }

      .expiration-content {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .expiration-label {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
      }

      .expiration-value {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--ion-color-dark);
      }

      .expiration-value.warning {
        color: var(--ion-color-warning);
      }

      /* Renewal Section */
      .renewal-section {
        margin-bottom: 24px;
      }

      .renewal-section h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--ion-color-dark);
      }

      .renewal-description {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        margin-bottom: 16px;
      }

      .renewal-progress {
        padding: 16px;
        background: var(--ion-color-light);
        border-radius: 8px;
      }

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .progress-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--ion-color-dark);
      }

      .progress-value {
        font-size: 1rem;
        font-weight: 700;
        color: var(--ion-color-primary);
      }

      .progress-message {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        margin: 8px 0 0 0;
      }

      .progress-message.eligible {
        color: var(--ion-color-success);
      }

      /* Info and Warning Cards */
      .info-card,
      .warning-card {
        margin: 16px 0;
        box-shadow: none;
      }

      .info-card {
        background: var(--ion-color-primary-tint);
      }

      .warning-card {
        background: var(--ion-color-danger-tint);
      }

      .info-content,
      .warning-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .info-content ion-icon,
      .warning-content ion-icon {
        font-size: 24px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .info-content p,
      .warning-content p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--ion-color-dark);
      }

      ion-button {
        margin-top: 16px;
      }
    `,
  ],
})
export class ProtectionCreditCardComponent implements OnInit {
  readonly protectionCreditService = inject(ProtectionCreditService);

  // Computed signals from service
  readonly balance = computed(() => this.protectionCreditService.balance());
  readonly hasBalance = computed(() => this.protectionCreditService.hasBalance());
  readonly isExpired = computed(() => this.protectionCreditService.isExpired());
  readonly isNearExpiry = computed(() => this.protectionCreditService.isNearExpiry());
  readonly daysUntilExpiry = computed(() => this.protectionCreditService.daysUntilExpiry());
  readonly statusBadgeColor = computed(() => this.protectionCreditService.getStatusBadgeColor());
  readonly statusIcon = computed(() => this.protectionCreditService.getStatusIcon());
  readonly formattedBalance = computed(() => this.protectionCreditService.getFormattedBalance());
  readonly formattedExpiry = computed(() => this.protectionCreditService.getFormattedExpiry());
  readonly daysRemainingText = computed(() => this.protectionCreditService.getDaysRemainingText());
  readonly usagePercentage = computed(() => this.protectionCreditService.getUsagePercentage());
  readonly infoMessage = computed(() => this.protectionCreditService.getInfoMessage());

  // Renewal progress (loaded separately)
  readonly renewalProgress = computed(() => this._renewalProgress());
  private readonly _renewalProgress = computed(() => {
    // This will be loaded in ngOnInit
    return this._renewalProgressData;
  });

  private _renewalProgressData: {
    eligible: boolean;
    progress: number;
    message: string;
  } | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadBalance();
    await this.loadRenewalProgress();
  }

  async loadBalance(): Promise<void> {
    await this.protectionCreditService.loadBalance();
  }

  async loadRenewalProgress(): Promise<void> {
    try {
      this._renewalProgressData = await this.protectionCreditService.getRenewalProgress();
    } catch (error) {
      console.error('[ProtectionCreditCard] Error al cargar progreso de renovación:', error);
    }
  }

  onLearnMore(): void {
    // TODO: Open modal with CP explanation
    console.log('[ProtectionCreditCard] Learn more clicked');
  }
}
