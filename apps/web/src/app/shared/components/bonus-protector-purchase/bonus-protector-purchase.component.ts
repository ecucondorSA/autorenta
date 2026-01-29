import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BonusProtectorService } from '@core/services/payments/bonus-protector.service';
import { DriverProfileService } from '@core/services/auth/driver-profile.service';

/**
 * BonusProtectorPurchaseComponent
 *
 * Interfaz para comprar el add-on Protector de Bonus.
 *
 * OPCIONES:
 * - Nivel 1: $15 USD - Protege 1 siniestro leve
 * - Nivel 2: $25 USD - Protege 2 siniestros leves o 1 moderado
 * - Nivel 3: $40 USD - Protege 3 siniestros leves, 2 moderados o 1 grave
 *
 * CARACTERÍSTICAS:
 * - Muestra nivel recomendado según clase del conductor
 * - Calcula ahorro potencial por nivel
 * - Simulación de impacto de siniestro
 * - Validación de fondos en wallet
 * - Confirmación de compra
 *
 * VALIDACIONES:
 * - Solo 1 protector activo a la vez
 * - Fondos suficientes en wallet
 * - Protector expirado puede renovarse
 */

@Component({
  selector: 'app-bonus-protector-purchase',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonicModule],
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="shield-half-outline"></ion-icon>
          Protector de Bonus
        </ion-card-title>
        <ion-card-subtitle> Protege tu clase de conductor tras siniestros </ion-card-subtitle>
      </ion-card-header>

      <ion-card-content>
        <!-- Loading State -->
        @if (bonusProtectorService.loading()) {
          <div class="loading-container">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Cargando opciones...</p>
          </div>
        }

        <!-- Error State -->
        @if (bonusProtectorService.error()) {
          <div class="error-container">
            <ion-icon name="alert-circle-outline" color="danger"></ion-icon>
            <p>{{ bonusProtectorService.error() }}</p>
          </div>
        }

        <!-- Options Loaded -->
        @if (!bonusProtectorService.loading() && !bonusProtectorService.error()) {
          <div>
            <!-- Active Protector -->
            @if (hasActiveProtector() && !isExpired()) {
              <ion-card class="active-protector-card">
                <ion-card-content>
                  <div class="active-protector">
                    <div class="protector-header">
                      <ion-badge [color]="statusBadgeColor()">
                        {{ levelIcon() }} Nivel {{ protectionLevel() }}
                      </ion-badge>
                      <span class="protector-status">Activo</span>
                    </div>
                    <p class="protector-info">{{ infoMessage() }}</p>
                    <div class="protector-expiry">
                      <ion-icon name="calendar-outline" color="medium"></ion-icon>
                      <span>Expira: {{ formattedExpiry() }}</span>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            }
            <!-- Expired Protector Warning -->
            @if (hasActiveProtector() && isExpired()) {
              <ion-card class="warning-card">
                <ion-card-content>
                  <div class="warning-content">
                    <ion-icon name="alert-circle-outline" color="warning"></ion-icon>
                    <p>
                      Tu Protector de Bonus ha expirado. Compra uno nuevo para seguir protegido.
                    </p>
                  </div>
                </ion-card-content>
              </ion-card>
            }
            <!-- Recommendation Banner -->
            @if (recommendedLevel() > 0) {
              <ion-card class="recommendation-card">
                <ion-card-content>
                  <div class="recommendation">
                    <ion-icon name="bulb-outline" color="primary"></ion-icon>
                    <div class="recommendation-content">
                      <p class="recommendation-title">Recomendado para ti</p>
                      <p class="recommendation-text">
                        Basado en tu clase actual ({{ driverClass() }}), recomendamos el
                        <strong>Nivel {{ recommendedLevel() }}</strong
                        >.
                      </p>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            }
            <!-- Purchase Options -->
            <div class="options-section">
              <h3>Opciones Disponibles</h3>
              @for (option of options(); track option) {
                <div class="option-card">
                  <div class="option-header">
                    <div class="option-title">
                      <span class="level-icon">{{ getLevelIcon(option.protection_level) }}</span>
                      <span class="level-name">Nivel {{ option.protection_level }}</span>
                      @if (option.protection_level === recommendedLevel()) {
                        <ion-badge color="primary"> Recomendado </ion-badge>
                      }
                    </div>
                    <div class="option-price">
                      <span class="price">\${{ option.price_usd }}</span>
                      <span class="currency">USD</span>
                    </div>
                  </div>
                  <p class="option-description">{{ option.description }}</p>
                  <!-- Protection Capacity -->
                  <div class="capacity-section">
                    <p class="capacity-title">Cobertura:</p>
                    <div class="capacity-grid">
                      <div class="capacity-item">
                        <ion-icon name="fitness-outline" color="success"></ion-icon>
                        <span
                          >{{ getCapacity(option.protection_level).leve }} Leve{{
                            getCapacity(option.protection_level).leve > 1 ? 's' : ''
                          }}</span
                        >
                      </div>
                      @if (getCapacity(option.protection_level).moderado > 0) {
                        <div class="capacity-item">
                          <ion-icon name="warning-outline" color="warning"></ion-icon>
                          <span
                            >{{ getCapacity(option.protection_level).moderado }} Moderado{{
                              getCapacity(option.protection_level).moderado > 1 ? 's' : ''
                            }}</span
                          >
                        </div>
                      }
                      @if (getCapacity(option.protection_level).grave > 0) {
                        <div class="capacity-item">
                          <ion-icon name="alert-outline" color="danger"></ion-icon>
                          <span
                            >{{ getCapacity(option.protection_level).grave }} Grave{{
                              getCapacity(option.protection_level).grave > 1 ? 's' : ''
                            }}</span
                          >
                        </div>
                      }
                    </div>
                  </div>
                  <!-- Savings Estimate -->
                  @if (showSavings()) {
                    <div class="savings-section">
                      <p class="savings-title">Ahorro Estimado Anual:</p>
                      <div class="savings-amount">
                        <span class="savings-value"
                          >\${{ calculateSavings(option.protection_level).totalSavings }}</span
                        >
                        <span class="savings-label">USD</span>
                      </div>
                      <p
                        class="savings-roi"
                        [class.positive]="calculateSavings(option.protection_level).isWorthIt"
                      >
                        <ion-icon
                          [name]="
                            calculateSavings(option.protection_level).isWorthIt
                              ? 'trending-up-outline'
                              : 'trending-down-outline'
                          "
                          [color]="
                            calculateSavings(option.protection_level).isWorthIt
                              ? 'success'
                              : 'medium'
                          "
                        ></ion-icon>
                        {{
                          calculateSavings(option.protection_level).isWorthIt
                            ? 'Buena inversión'
                            : 'ROI bajo'
                        }}
                      </p>
                    </div>
                  }
                  <!-- Purchase Button -->
                  <ion-button
                    expand="block"
                    [color]="option.protection_level === recommendedLevel() ? 'primary' : 'medium'"
                    (click)="onPurchase(option.protection_level)"
                    [disabled]="!canPurchase() || purchasing()"
                  >
                    <ion-icon
                      slot="start"
                      [name]="purchasing() ? 'hourglass-outline' : 'cart-outline'"
                    ></ion-icon>
                    {{ purchasing() ? 'Comprando...' : 'Comprar Nivel ' + option.protection_level }}
                  </ion-button>
                </div>
              }
            </div>
            <!-- Simulation Section -->
            @if (driverClass() > 0) {
              <div class="simulation-section">
                <h3>Simulación de Siniestro</h3>
                <p class="simulation-description">
                  Ve cómo el Protector de Bonus afecta tu clase tras un siniestro.
                </p>
                <div class="simulation-controls">
                  <ion-item>
                    <ion-label>Severidad del Siniestro</ion-label>
                    <ion-select [(ngModel)]="simulationSeverity" interface="popover">
                      <ion-select-option [value]="1">Leve (+1 clase)</ion-select-option>
                      <ion-select-option [value]="2">Moderado (+2 clases)</ion-select-option>
                      <ion-select-option [value]="3">Grave (+3 clases)</ion-select-option>
                    </ion-select>
                  </ion-item>
                </div>
                <div class="simulation-results">
                  <div class="simulation-result">
                    <p class="result-title">Sin Protector</p>
                    <div class="result-class">
                      <span class="old-class">Clase {{ driverClass() }}</span>
                      <ion-icon name="arrow-forward-outline"></ion-icon>
                      <span class="new-class danger">Clase {{ simulateWithout().newClass }}</span>
                    </div>
                    <p class="result-impact">
                      Aumento: +{{ simulateWithout().increase }} clase{{
                        simulateWithout().increase > 1 ? 's' : ''
                      }}
                    </p>
                  </div>
                  <div class="simulation-result">
                    <p class="result-title">Con Protector (Nivel {{ selectedLevel() }})</p>
                    <div class="result-class">
                      <span class="old-class">Clase {{ driverClass() }}</span>
                      <ion-icon name="arrow-forward-outline"></ion-icon>
                      <span class="new-class" [class.success]="simulateWith().protected">
                        Clase {{ simulateWith().newClass }}
                      </span>
                    </div>
                    <p class="result-impact" [class.protected]="simulateWith().protected">
                      {{ simulateWith().protected ? '✅ Protegido' : 'Aumento reducido' }}:
                      {{
                        simulateWith().increase === 0
                          ? 'Sin cambio'
                          : '+' + simulateWith().increase + ' clase(s)'
                      }}
                    </p>
                  </div>
                </div>
              </div>
            }
            <!-- How it Works -->
            <ion-card class="info-card">
              <ion-card-content>
                <h4>
                  <ion-icon name="information-circle-outline" color="primary"></ion-icon>
                  ¿Cómo funciona?
                </h4>
                <ul>
                  <li>Válido por 1 año desde la compra</li>
                  <li>Se aplica automáticamente al registrar un siniestro</li>
                  <li>Reduce o elimina el aumento de clase</li>
                  <li>Se consume progresivamente según severidad</li>
                  <li>Solo puedes tener 1 protector activo a la vez</li>
                </ul>
              </ion-card-content>
            </ion-card>
          </div>
        }
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
      .error-container {
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

      .error-container ion-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      /* Active Protector Card */
      .active-protector-card {
        margin: 16px 0;
        background: var(--ion-color-success-tint);
        box-shadow: none;
      }

      .active-protector {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .protector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .protector-status {
        font-weight: 600;
        color: var(--ion-color-success);
      }

      .protector-info {
        font-size: 0.9rem;
        color: var(--ion-color-dark);
        margin: 0;
      }

      .protector-expiry {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        color: var(--ion-color-medium);
      }

      /* Warning Card */
      .warning-card {
        margin: 16px 0;
        background: var(--ion-color-warning-tint);
        box-shadow: none;
      }

      .warning-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .warning-content ion-icon {
        font-size: 24px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .warning-content p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--ion-color-dark);
      }

      /* Recommendation Card */
      .recommendation-card {
        margin: 16px 0;
        background: var(--ion-color-primary-tint);
        box-shadow: none;
      }

      .recommendation {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .recommendation ion-icon {
        font-size: 24px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .recommendation-content {
        flex: 1;
      }

      .recommendation-title {
        font-weight: 600;
        margin: 0 0 4px 0;
        color: var(--ion-color-dark);
      }

      .recommendation-text {
        margin: 0;
        font-size: 0.9rem;
        color: var(--ion-color-dark);
      }

      /* Options Section */
      .options-section {
        margin-bottom: 24px;
      }

      .options-section h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--ion-color-dark);
      }

      .option-card {
        padding: 16px;
        background: var(--ion-color-light);
        border-radius: 12px;
        margin-bottom: 16px;
        border: 2px solid transparent;
        transition: all 0.2s ease;
      }

      .option-card:hover {
        border-color: var(--ion-color-primary);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .option-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .option-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .level-icon {
        font-size: 1.5rem;
      }

      .level-name {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--ion-color-dark);
      }

      .option-price {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }

      .price {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--ion-color-primary);
      }

      .currency {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
      }

      .option-description {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        margin: 0 0 16px 0;
      }

      /* Capacity Section */
      .capacity-section {
        margin-bottom: 16px;
        padding: 12px;
        background: white;
        border-radius: 8px;
      }

      .capacity-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin: 0 0 8px 0;
      }

      .capacity-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .capacity-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--ion-color-light);
        border-radius: 6px;
        font-size: 0.85rem;
      }

      .capacity-item ion-icon {
        font-size: 16px;
      }

      /* Savings Section */
      .savings-section {
        margin-bottom: 16px;
        padding: 12px;
        background: white;
        border-radius: 8px;
        text-align: center;
      }

      .savings-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin: 0 0 8px 0;
      }

      .savings-amount {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 4px;
        margin-bottom: 4px;
      }

      .savings-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--ion-color-success);
      }

      .savings-label {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
      }

      .savings-roi {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin: 0;
      }

      .savings-roi.positive {
        color: var(--ion-color-success);
      }

      .savings-roi ion-icon {
        font-size: 16px;
      }

      /* Simulation Section */
      .simulation-section {
        margin-bottom: 24px;
      }

      .simulation-section h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--ion-color-dark);
      }

      .simulation-description {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        margin-bottom: 16px;
      }

      .simulation-controls {
        margin-bottom: 16px;
      }

      .simulation-results {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .simulation-result {
        padding: 16px;
        background: var(--ion-color-light);
        border-radius: 8px;
        text-align: center;
      }

      .result-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin: 0 0 12px 0;
      }

      .result-class {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .old-class,
      .new-class {
        font-size: 1rem;
        font-weight: 600;
      }

      .new-class.danger {
        color: var(--ion-color-danger);
      }

      .new-class.success {
        color: var(--ion-color-success);
      }

      .result-impact {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin: 0;
      }

      .result-impact.protected {
        color: var(--ion-color-success);
        font-weight: 600;
      }

      /* Info Card */
      .info-card {
        margin: 16px 0;
        background: var(--ion-color-light);
        box-shadow: none;
      }

      .info-card h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 12px;
      }

      .info-card ul {
        margin: 0;
        padding-left: 20px;
      }

      .info-card li {
        font-size: 0.9rem;
        color: var(--ion-color-dark);
        margin-bottom: 8px;
      }

      ion-button {
        margin-top: 12px;
      }
    `,
  ],
})
export class BonusProtectorPurchaseComponent implements OnInit {
  readonly bonusProtectorService = inject(BonusProtectorService);
  readonly driverProfileService = inject(DriverProfileService);

  // State
  readonly purchasing = signal(false);
  readonly selectedLevel = signal(1);
  simulationSeverity = 1; // For ngModel

  // Computed signals from services
  readonly options = computed(() => this.bonusProtectorService.options());
  readonly hasActiveProtector = computed(() => this.bonusProtectorService.hasActiveProtector());
  readonly protectionLevel = computed(() => this.bonusProtectorService.protectionLevel());
  readonly isExpired = computed(() => this.bonusProtectorService.isExpired());
  readonly statusBadgeColor = computed(() => this.bonusProtectorService.getStatusBadgeColor());
  readonly infoMessage = computed(() => this.bonusProtectorService.getInfoMessage());
  readonly formattedExpiry = computed(() => this.bonusProtectorService.getFormattedExpiry());

  readonly driverClass = computed(() => this.driverProfileService.driverClass());
  readonly recommendedLevel = computed(() => {
    return this.bonusProtectorService.getRecommendedLevel(this.driverClass());
  });

  // Helpers
  readonly canPurchase = computed(() => {
    return !this.hasActiveProtector() || this.isExpired();
  });

  readonly showSavings = computed(() => {
    return this.driverClass() > 0;
  });

  // Simulation
  readonly simulateWithout = computed(() => {
    const impact = this.bonusProtectorService.simulateClaimImpact(
      this.driverClass(),
      this.simulationSeverity,
    );
    return impact.withoutProtector;
  });

  readonly simulateWith = computed(() => {
    const impact = this.bonusProtectorService.simulateClaimImpact(
      this.driverClass(),
      this.simulationSeverity,
    );
    return impact.withProtector;
  });

  async ngOnInit(): Promise<void> {
    await this.loadOptions();
    await this.loadActiveProtector();
    await this.driverProfileService.loadProfile();

    // Set default selected level to recommended
    this.selectedLevel.set(this.recommendedLevel());
  }

  async loadOptions(): Promise<void> {
    await this.bonusProtectorService.loadOptions();
  }

  async loadActiveProtector(): Promise<void> {
    await this.bonusProtectorService.loadActiveProtector();
  }

  getLevelIcon(level: number): string {
    return this.bonusProtectorService.getLevelIcon(level);
  }

  levelIcon(): string {
    return this.bonusProtectorService.getLevelIcon(this.protectionLevel());
  }

  getCapacity(level: number): {
    leve: number;
    moderado: number;
    grave: number;
    description: string;
  } {
    return this.bonusProtectorService.getProtectionCapacity(level);
  }

  calculateSavings(level: number): {
    feeIncrease: number;
    guaranteeIncrease: number;
    totalSavings: number;
    isWorthIt: boolean;
  } {
    // Example values - in a real app, these would come from user data or averages
    const baseFeeUsd = 50;
    const baseGuaranteeUsd = 1000;

    return this.bonusProtectorService.calculatePotentialSavings(
      level,
      this.driverClass(),
      baseFeeUsd,
      baseGuaranteeUsd,
    );
  }

  async onPurchase(level: number): Promise<void> {
    if (this.purchasing()) return;

    this.selectedLevel.set(level);
    this.purchasing.set(true);

    try {
      // Check eligibility
      const eligibility = await this.bonusProtectorService.canPurchase(level);

      if (!eligibility.can) {
        alert(eligibility.reason);
        return;
      }

      // Confirm purchase
      const confirmed = confirm(
        `¿Confirmas la compra del Protector de Bonus Nivel ${level} por $${this.options().find((o) => o.protection_level === level)?.price_usd} USD?\n\nEste monto se deducirá de tu wallet.`,
      );

      if (!confirmed) return;

      // Purchase
      await this.bonusProtectorService.purchaseProtector(level);

      alert('¡Protector de Bonus comprado exitosamente! Ya estás protegido por 1 año.');

      // Reload
      await this.loadActiveProtector();
    } catch (_error) {
      console.error('[BonusProtectorPurchase] Error al comprar:', _error);
      alert(
        'Error al comprar Protector de Bonus. Verifica que tengas fondos suficientes en tu wallet.',
      );
    } finally {
      this.purchasing.set(false);
    }
  }
}
