import {Component, computed, inject, OnInit,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { DriverProfileService } from '../../../core/services/driver-profile.service';
import { BonusProtectorService } from '../../../core/services/bonus-protector.service';
import { ClassBenefitsModalComponent } from '../class-benefits-modal/class-benefits-modal.component';

/**
 * DriverProfileCardComponent
 *
 * Tarjeta que muestra el perfil de riesgo del conductor.
 *
 * MUESTRA:
 * - Clase actual (0-10) con badge visual
 * - Score telemático (0-100)
 * - Estado de Bonus Protector activo (NUEVO)
 * - Beneficios (descuentos) o recargos
 * - Historial de siniestros
 * - Progreso hacia mejor clase
 *
 * DISEÑO:
 * - Badge de clase con color según riesgo
 * - Badge de protector activo con nivel y expiración (NUEVO)
 * - Barra de progreso para score telemático
 * - Iconos visuales (🏆, ⭐, ⚠️, 🔴, 🛡️)
 * - Información detallada expandible
 */

@Component({
  selector: 'app-driver-profile-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="person-circle-outline"></ion-icon>
          Perfil de Conductor
        </ion-card-title>
      </ion-card-header>

      <ion-card-content>
        <!-- Loading State -->
        <div *ngIf="driverProfileService.loading()" class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Cargando perfil...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="driverProfileService.error()" class="error-container">
          <ion-icon name="alert-circle-outline" color="danger"></ion-icon>
          <p>{{ driverProfileService.error() }}</p>
        </div>

        <!-- Profile Loaded -->
        <div *ngIf="!driverProfileService.loading() && !driverProfileService.error() && profile()">
          <!-- Class Badge -->
          <div class="class-section">
            <div class="class-badge-container">
              <ion-badge [color]="classBadge().color" class="class-badge">
                <span class="class-icon">{{ classBadge().icon }}</span>
                <span class="class-label">Clase {{ driverClass() }}</span>
              </ion-badge>
            </div>
            <p class="class-description">{{ classDescription() }}</p>
          </div>

          <!-- Bonus Protector Status (NEW) -->
          <div class="protector-section" *ngIf="!bonusProtectorService.loading()">
            <!-- Active Protector -->
            <ion-card class="protector-card" *ngIf="hasActiveProtector() && !isProtectorExpired()">
              <ion-card-content>
                <div class="protector-active">
                  <div class="protector-header">
                    <ion-badge [color]="protectorBadgeColor()" class="protector-badge">
                      <ion-icon [name]="protectorIcon()"></ion-icon>
                      <span>{{ protectorBadgeText() }}</span>
                    </ion-badge>
                  </div>
                  <div class="protector-info">
                    <div class="protector-detail">
                      <ion-icon name="shield-checkmark-outline" color="success"></ion-icon>
                      <span
                        >{{ remainingClaims() }} uso{{
                          remainingClaims() === 1 ? '' : 's'
                        }}
                        restante{{ remainingClaims() === 1 ? '' : 's' }}</span
                      >
                    </div>
                    <div class="protector-detail">
                      <ion-icon
                        name="calendar-outline"
                        [color]="isNearExpiry() ? 'warning' : 'medium'"
                      ></ion-icon>
                      <span>{{ expiryMessage() }}</span>
                    </div>
                  </div>
                  <ion-button
                    fill="clear"
                    size="small"
                    (click)="onManageProtector()"
                    class="manage-button"
                  >
                    <ion-icon slot="start" name="settings-outline"></ion-icon>
                    Gestionar
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>

            <!-- Expired or No Protector -->
            <ion-card
              class="protector-card warning"
              *ngIf="!hasActiveProtector() || isProtectorExpired()"
            >
              <ion-card-content>
                <div class="protector-warning">
                  <ion-icon name="shield-outline" color="medium"></ion-icon>
                  <div class="warning-content">
                    <p class="warning-title">
                      {{ isProtectorExpired() ? 'Tu protección expiró' : 'Sin protección activa' }}
                    </p>
                    <p class="warning-message">
                      {{
                        isProtectorExpired()
                          ? 'Renueva tu Bonus Protector para seguir protegido'
                          : 'Protege tu clase de conductor de siniestros inesperados'
                      }}
                    </p>
                  </div>
                </div>
                <ion-button
                  expand="block"
                  size="small"
                  color="primary"
                  (click)="onPurchaseProtector()"
                >
                  <ion-icon slot="start" name="shield-checkmark-outline"></ion-icon>
                  {{ isProtectorExpired() ? 'Renovar Protección' : 'Comprar Protección' }}
                </ion-button>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- Score Section -->
          <div class="score-section">
            <div class="score-header">
              <span class="score-label">Score Telemático</span>
              <span class="score-value" [style.color]="scoreColor()">
                {{ driverScore() }}/100
              </span>
            </div>
            <ion-progress-bar
              [value]="driverScore() / 100"
              [color]="scoreBarColor()"
            ></ion-progress-bar>
            <p class="score-message">{{ scoreMessage() }}</p>
          </div>

          <!-- Benefits Section -->
          <div class="benefits-section">
            <h3>Beneficios Actuales</h3>

            <!-- Fee Discount/Surcharge -->
            <div class="benefit-item">
              <ion-icon
                [name]="hasDiscount() ? 'trending-down-outline' : 'trending-up-outline'"
                [color]="hasDiscount() ? 'success' : 'danger'"
              ></ion-icon>
              <div class="benefit-content">
                <span class="benefit-label">Tarifa de Servicio</span>
                <span
                  class="benefit-value"
                  [class.discount]="hasDiscount()"
                  [class.surcharge]="hasSurcharge()"
                >
                  {{ feeDiscountPct() > 0 ? '-' : '+' }}{{ Math.abs(feeDiscountPct()) }}%
                </span>
              </div>
            </div>

            <!-- Guarantee Discount/Surcharge -->
            <div class="benefit-item">
              <ion-icon
                [name]="hasDiscount() ? 'shield-checkmark-outline' : 'shield-outline'"
                [color]="hasDiscount() ? 'success' : 'danger'"
              ></ion-icon>
              <div class="benefit-content">
                <span class="benefit-label">Garantía</span>
                <span
                  class="benefit-value"
                  [class.discount]="hasDiscount()"
                  [class.surcharge]="hasSurcharge()"
                >
                  {{ guaranteeDiscountPct() > 0 ? '-' : '+'
                  }}{{ Math.abs(guaranteeDiscountPct()) }}%
                </span>
              </div>
            </div>
          </div>

          <!-- Claims History -->
          <div class="claims-section" *ngIf="profile()">
            <h3>Historial de Siniestros</h3>
            <div class="claims-stats">
              <div class="claim-stat">
                <span class="claim-label">Total</span>
                <span class="claim-value">{{ profile()!.total_claims }}</span>
              </div>
              <div class="claim-stat">
                <span class="claim-label">Con Responsabilidad</span>
                <span class="claim-value">{{ profile()!.claims_with_fault }}</span>
              </div>
              <div class="claim-stat">
                <span class="claim-label">Años Buenos</span>
                <span class="claim-value">{{ profile()!.good_years }}</span>
              </div>
            </div>

            <p class="last-claim" *ngIf="profile()!.last_claim_at">
              <ion-icon name="time-outline"></ion-icon>
              Último siniestro: {{ formatDate(profile()!.last_claim_at) }}
            </p>
          </div>

          <!-- Progress to Next Class -->
          <div class="progress-section" *ngIf="progress().canImprove">
            <h3>Progreso hacia Clase {{ progress().nextClass }}</h3>
            <p class="progress-message">
              <ion-icon name="trophy-outline" color="primary"></ion-icon>
              Necesitas {{ progress().yearsNeeded }} año{{ progress().yearsNeeded > 1 ? 's' : '' }}
              sin siniestros con responsabilidad para mejorar tu clase.
            </p>
          </div>

          <!-- Maximum Class Reached -->
          <div class="progress-section" *ngIf="!progress().canImprove && driverClass() === 0">
            <p class="max-class-message">
              <ion-icon name="star-outline" color="success"></ion-icon>
              ¡Felicitaciones! Alcanzaste la clase máxima (0).
            </p>
          </div>

          <!-- View Details Button -->
          <ion-button expand="block" fill="outline" (click)="onViewDetails()">
            <ion-icon slot="start" name="information-circle-outline"></ion-icon>
            Ver Detalles del Sistema
          </ion-button>
        </div>

        <!-- No Profile Yet -->
        <div *ngIf="!driverProfileService.loading() && !profile()" class="no-profile">
          <ion-icon name="person-add-outline" color="medium"></ion-icon>
          <p>No tienes perfil de conductor aún.</p>
          <ion-button (click)="onInitializeProfile()"> Inicializar Perfil </ion-button>
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

      /* Loading and Error States */
      .loading-container,
      .error-container,
      .no-profile {
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
      .no-profile ion-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      /* Class Section */
      .class-section {
        margin-bottom: 24px;
        text-align: center;
      }

      .class-badge-container {
        display: flex;
        justify-content: center;
        margin-bottom: 12px;
      }

      .class-badge {
        font-size: 1.1rem;
        padding: 12px 24px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .class-icon {
        font-size: 1.3rem;
      }

      .class-label {
        font-weight: 600;
      }

      .class-description {
        color: var(--ion-color-medium);
        font-size: 0.95rem;
        margin: 0;
      }

      /* Protector Section (NEW) */
      .protector-section {
        margin-bottom: 24px;
      }

      .protector-card {
        margin: 0 0 16px 0;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      }

      .protector-card.warning {
        background: var(--ion-color-light);
      }

      .protector-card ion-card-content {
        padding: 16px;
      }

      .protector-active {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .protector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .protector-badge {
        font-size: 0.95rem;
        padding: 8px 16px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .protector-badge ion-icon {
        font-size: 1.1rem;
      }

      .protector-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .protector-detail {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: var(--ion-color-dark);
      }

      .protector-detail ion-icon {
        font-size: 1.1rem;
      }

      .manage-button {
        align-self: flex-start;
        margin: 0;
        --padding-start: 0;
      }

      .protector-warning {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }

      .protector-warning > ion-icon {
        font-size: 32px;
        flex-shrink: 0;
        margin-top: 4px;
      }

      .warning-content {
        flex: 1;
      }

      .warning-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin: 0 0 4px 0;
      }

      .warning-message {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin: 0;
        line-height: 1.4;
      }

      /* Score Section */
      .score-section {
        margin-bottom: 24px;
        padding: 16px;
        background: var(--ion-color-light);
        border-radius: 8px;
      }

      .score-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .score-label {
        font-weight: 600;
        color: var(--ion-color-dark);
      }

      .score-value {
        font-size: 1.2rem;
        font-weight: 700;
      }

      ion-progress-bar {
        height: 8px;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      .score-message {
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        margin: 0;
        text-align: center;
      }

      /* Benefits Section */
      .benefits-section {
        margin-bottom: 24px;
      }

      .benefits-section h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--ion-color-dark);
      }

      .benefit-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--ion-color-light);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .benefit-item ion-icon {
        font-size: 24px;
      }

      .benefit-content {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .benefit-label {
        font-size: 0.95rem;
        color: var(--ion-color-dark);
      }

      .benefit-value {
        font-size: 1.1rem;
        font-weight: 700;
      }

      .benefit-value.discount {
        color: var(--ion-color-success);
      }

      .benefit-value.surcharge {
        color: var(--ion-color-danger);
      }

      /* Claims Section */
      .claims-section {
        margin-bottom: 24px;
      }

      .claims-section h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--ion-color-dark);
      }

      .claims-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 12px;
      }

      .claim-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px;
        background: var(--ion-color-light);
        border-radius: 8px;
      }

      .claim-label {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        text-align: center;
        margin-bottom: 4px;
      }

      .claim-value {
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--ion-color-dark);
      }

      .last-claim {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        margin: 0;
      }

      /* Progress Section */
      .progress-section {
        margin-bottom: 16px;
      }

      .progress-section h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--ion-color-dark);
      }

      .progress-message {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--ion-color-primary-tint);
        border-radius: 8px;
        font-size: 0.95rem;
        margin: 0;
      }

      .max-class-message {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--ion-color-success-tint);
        border-radius: 8px;
        font-size: 0.95rem;
        margin: 0;
        color: var(--ion-color-success-shade);
      }

      ion-button {
        margin-top: 16px;
      }
    `,
  ],
})
export class DriverProfileCardComponent implements OnInit {
  readonly driverProfileService = inject(DriverProfileService);
  readonly bonusProtectorService = inject(BonusProtectorService);
  private readonly modalController = inject(ModalController);
  private readonly router = inject(Router);

  // Expose Math for template
  readonly Math = Math;

  // Computed signals from service
  readonly profile = computed(() => this.driverProfileService.profile());
  readonly driverClass = computed(() => this.driverProfileService.driverClass());
  readonly driverScore = computed(() => this.driverProfileService.driverScore());
  readonly hasDiscount = computed(() => this.driverProfileService.hasDiscount());
  readonly hasSurcharge = computed(() => this.driverProfileService.hasSurcharge());
  readonly feeDiscountPct = computed(() => this.driverProfileService.feeDiscountPct());
  readonly guaranteeDiscountPct = computed(() => this.driverProfileService.guaranteeDiscountPct());
  readonly classDescription = computed(() => this.driverProfileService.getClassDescription());
  readonly classBadge = computed(() => this.driverProfileService.getClassBadge());

  // Progress
  readonly progress = computed(() => this.driverProfileService.getProgressToNextClass());

  // Score helpers
  readonly scoreColor = computed(() => {
    const color = this.driverProfileService.getScoreColor();
    return `var(--ion-color-${color})`;
  });

  readonly scoreBarColor = computed(() => {
    return this.driverProfileService.getScoreColor();
  });

  readonly scoreMessage = computed(() => {
    return this.driverProfileService.getScoreMessage();
  });

  // Bonus Protector signals (NEW)
  readonly hasActiveProtector = computed(() => this.bonusProtectorService.hasActiveProtector());
  readonly isProtectorExpired = computed(() => this.bonusProtectorService.isExpired());
  readonly isNearExpiry = computed(() => this.bonusProtectorService.isNearExpiry());
  readonly protectionLevel = computed(() => this.bonusProtectorService.protectionLevel());
  readonly activeProtector = computed(() => this.bonusProtectorService.activeProtector());

  readonly remainingClaims = computed(() => {
    const protector = this.activeProtector();
    return protector?.remaining_protected_claims ?? 0;
  });

  readonly protectorBadgeColor = computed(() => {
    if (this.isProtectorExpired()) return 'danger';
    if (this.isNearExpiry()) return 'warning';
    return 'success';
  });

  readonly protectorIcon = computed(() => {
    const level = this.protectionLevel();
    if (level === 1) return 'shield-outline';
    if (level === 2) return 'shield-half-outline';
    if (level === 3) return 'shield-checkmark-outline';
    return 'shield-outline';
  });

  readonly protectorBadgeText = computed(() => {
    const level = this.protectionLevel();
    const icon = level === 1 ? '🛡️' : level === 2 ? '🛡️🛡️' : '🛡️🛡️🛡️';
    return `${icon} Protegido Nivel ${level}`;
  });

  readonly expiryMessage = computed(() => {
    const protector = this.activeProtector();
    if (!protector) return '';

    const days = protector.days_until_expiry ?? 0;
    if (days < 0) return 'Expirado';
    if (days === 0) return 'Expira hoy';
    if (days === 1) return 'Expira mañana';
    if (days <= 7) return `Expira en ${days} días`;
    if (days <= 30) return `Expira en ${Math.ceil(days / 7)} semanas`;
    return `Expira en ${Math.ceil(days / 30)} meses`;
  });

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
    await this.loadActiveProtector();
  }

  async loadProfile(): Promise<void> {
    await this.driverProfileService.loadProfile();
  }

  async loadActiveProtector(): Promise<void> {
    try {
      await this.bonusProtectorService.loadActiveProtector();
    } catch (error) {
      console.error('[DriverProfileCard] Error al cargar protector activo:', error);
    }
  }

  async onInitializeProfile(): Promise<void> {
    try {
      await this.driverProfileService.initializeProfile();
    } catch (_error) {
      console.error('[DriverProfileCard] Error al inicializar perfil:', _error);
    }
  }

  onManageProtector(): void {
    this.router.navigate(['/protections']);
  }

  onPurchaseProtector(): void {
    this.router.navigate(['/protections']);
  }

  async onViewDetails(): Promise<void> {
    try {
      const modal = await this.modalController.create({
        component: ClassBenefitsModalComponent,
        componentProps: {
          currentClass: this.driverClass(),
        },
      });
      await modal.present();
    } catch (error) {
      console.error('[DriverProfileCard] Error al abrir modal de beneficios:', error);
    }
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
