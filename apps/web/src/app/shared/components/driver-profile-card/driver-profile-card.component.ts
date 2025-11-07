import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { DriverProfileService } from '../../../core/services/driver-profile.service';
import { TelemetryService, TelemetryHistory } from '../../../core/services/telemetry.service';
import { ClassBenefitsModalComponent } from '../class-benefits-modal/class-benefits-modal.component';

/**
 * DriverProfileCardComponent
 *
 * Tarjeta que muestra el perfil de riesgo del conductor.
 *
 * MUESTRA:
 * - Clase actual (0-10) con badge visual
 * - Score telemático (0-100)
 * - Beneficios (descuentos) o recargos
 * - Historial de siniestros
 * - Progreso hacia mejor clase
 *
 * DISEÑO:
 * - Badge de clase con color según riesgo
 * - Barra de progreso para score telemático
 * - Iconos visuales (🏆, ⭐, ⚠️, 🔴)
 * - Información detallada expandible
 */

@Component({
  selector: 'app-driver-profile-card',
  standalone: true,
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
                  {{ guaranteeDiscountPct() > 0 ? '-' : '+' }}{{ Math.abs(guaranteeDiscountPct()) }}%
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

          <!-- Telemetry Data Section -->
          <div class="telemetry-section" *ngIf="telemetryHistory().length > 0">
            <h3>
              <ion-icon name="speedometer-outline"></ion-icon>
              Datos Telemáticos Recientes
            </h3>

            <div class="telemetry-item" *ngFor="let trip of telemetryHistory().slice(0, 3)">
              <div class="telemetry-header">
                <span class="trip-date">{{ formatDate(trip.trip_date) }}</span>
                <ion-badge [color]="getScoreBadgeColor(trip.driver_score)">
                  Score: {{ trip.driver_score }}
                </ion-badge>
              </div>

              <div class="telemetry-details">
                <div class="telemetry-stat">
                  <ion-icon name="car-outline" size="small"></ion-icon>
                  <span>{{ trip.total_km }} km</span>
                </div>
                <div class="telemetry-stat warning" *ngIf="trip.hard_brakes > 0">
                  <ion-icon name="warning-outline" size="small" color="warning"></ion-icon>
                  <span>{{ trip.hard_brakes }} frenadas bruscas</span>
                </div>
                <div class="telemetry-stat danger" *ngIf="trip.speed_violations > 0">
                  <ion-icon name="alert-circle-outline" size="small" color="danger"></ion-icon>
                  <span>{{ trip.speed_violations }} excesos velocidad</span>
                </div>
                <div class="telemetry-stat" *ngIf="trip.night_driving_hours > 0">
                  <ion-icon name="moon-outline" size="small"></ion-icon>
                  <span>{{ trip.night_driving_hours }}h conducción nocturna</span>
                </div>
              </div>

              <p class="trip-car">{{ trip.car_brand }} {{ trip.car_model }}</p>
            </div>

            <p class="telemetry-footer" *ngIf="telemetryHistory().length === 0">
              No hay datos telemáticos registrados aún.
            </p>
          </div>

          <!-- Scoring Methodology Section -->
          <div class="methodology-section">
            <h3>
              <ion-icon name="calculator-outline"></ion-icon>
              Metodología de Puntuación
            </h3>

            <ion-accordion-group>
              <!-- Class Progression -->
              <ion-accordion value="class-progression">
                <ion-item slot="header">
                  <ion-label>
                    <h4>Progresión de Clase</h4>
                  </ion-label>
                </ion-item>
                <div slot="content" class="accordion-content">
                  <p><strong>Mejora de clase:</strong></p>
                  <ul>
                    <li>1 año sin siniestros con responsabilidad = -1 clase</li>
                    <li>La clase 0 es la mejor (máximos descuentos)</li>
                    <li>La clase 5 es la base (sin ajustes)</li>
                  </ul>

                  <p><strong>Aumento de clase por siniestro:</strong></p>
                  <ul>
                    <li>Siniestro leve: +1 clase</li>
                    <li>Siniestro moderado: +2 clases</li>
                    <li>Siniestro grave: +3 clases</li>
                    <li>Máximo: Clase 10 (mayores recargos)</li>
                  </ul>
                </div>
              </ion-accordion>

              <!-- Telemetry Score -->
              <ion-accordion value="telemetry-score">
                <ion-item slot="header">
                  <ion-label>
                    <h4>Score Telemático (0-100)</h4>
                  </ion-label>
                </ion-item>
                <div slot="content" class="accordion-content">
                  <p><strong>Factores evaluados:</strong></p>
                  <ul>
                    <li><strong>Frenadas bruscas:</strong> -5 puntos por evento</li>
                    <li><strong>Excesos de velocidad:</strong> -10 puntos por evento</li>
                    <li><strong>Conducción nocturna:</strong> -2 puntos por hora</li>
                    <li><strong>Zonas de riesgo:</strong> -3 puntos por visita</li>
                  </ul>

                  <p><strong>Rangos de evaluación:</strong></p>
                  <ul>
                    <li>90-100: Excelente conductor 🏆</li>
                    <li>80-89: Muy bueno 👏</li>
                    <li>70-79: Bueno 👍</li>
                    <li>60-69: Aceptable 📈</li>
                    <li>40-59: Necesita mejorar ⚠️</li>
                    <li>0-39: Riesgo alto 🚨</li>
                  </ul>
                </div>
              </ion-accordion>

              <!-- Benefits Calculation -->
              <ion-accordion value="benefits">
                <ion-item slot="header">
                  <ion-label>
                    <h4>Cálculo de Beneficios</h4>
                  </ion-label>
                </ion-item>
                <div slot="content" class="accordion-content">
                  <p><strong>Multiplicadores por clase:</strong></p>
                  <ul>
                    <li><strong>Clase 0:</strong> -15% fee, -25% garantía</li>
                    <li><strong>Clase 1:</strong> -12% fee, -20% garantía</li>
                    <li><strong>Clase 2:</strong> -9% fee, -15% garantía</li>
                    <li><strong>Clase 3:</strong> -6% fee, -10% garantía</li>
                    <li><strong>Clase 4:</strong> -3% fee, -5% garantía</li>
                    <li><strong>Clase 5:</strong> Base (sin ajustes)</li>
                    <li><strong>Clase 6:</strong> +3% fee, +10% garantía</li>
                    <li><strong>Clase 7:</strong> +6% fee, +20% garantía</li>
                    <li><strong>Clase 8:</strong> +10% fee, +40% garantía</li>
                    <li><strong>Clase 9:</strong> +15% fee, +60% garantía</li>
                    <li><strong>Clase 10:</strong> +20% fee, +80% garantía</li>
                  </ul>
                </div>
              </ion-accordion>
            </ion-accordion-group>
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
          <ion-button (click)="onInitializeProfile()">
            Inicializar Perfil
          </ion-button>
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

      /* Telemetry Section */
      .telemetry-section {
        margin-bottom: 24px;
      }

      .telemetry-section h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--ion-color-dark);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .telemetry-item {
        background: var(--ion-color-light);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .telemetry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .trip-date {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--ion-color-dark);
      }

      .telemetry-details {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
      }

      .telemetry-stat {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        padding: 4px 8px;
        background: white;
        border-radius: 4px;
      }

      .telemetry-stat.warning {
        color: var(--ion-color-warning);
      }

      .telemetry-stat.danger {
        color: var(--ion-color-danger);
      }

      .trip-car {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin: 0;
        font-style: italic;
      }

      .telemetry-footer {
        text-align: center;
        color: var(--ion-color-medium);
        font-size: 0.9rem;
        padding: 16px;
      }

      /* Methodology Section */
      .methodology-section {
        margin-bottom: 24px;
      }

      .methodology-section h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--ion-color-dark);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .accordion-content {
        padding: 16px;
        font-size: 0.9rem;
      }

      .accordion-content p {
        margin-top: 0;
        margin-bottom: 8px;
        color: var(--ion-color-dark);
      }

      .accordion-content ul {
        margin: 0 0 12px 0;
        padding-left: 20px;
      }

      .accordion-content li {
        margin-bottom: 6px;
        line-height: 1.5;
        color: var(--ion-color-medium-shade);
      }

      .accordion-content li:last-child {
        margin-bottom: 0;
      }

      ion-accordion-group {
        border-radius: 8px;
        overflow: hidden;
      }

      ion-accordion ion-item {
        --background: var(--ion-color-light);
        --padding-start: 12px;
        --padding-end: 12px;
      }

      ion-accordion ion-item h4 {
        font-size: 0.95rem;
        font-weight: 600;
        margin: 0;
      }
    `,
  ],
})
export class DriverProfileCardComponent implements OnInit {
  readonly driverProfileService = inject(DriverProfileService);
  readonly telemetryService = inject(TelemetryService);
  private readonly modalController = inject(ModalController);

  // Expose Math for template
  readonly Math = Math;

  // Telemetry history signal
  readonly telemetryHistory = signal<TelemetryHistory[]>([]);

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

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
    await this.loadTelemetryHistory();
  }

  async loadProfile(): Promise<void> {
    await this.driverProfileService.loadProfile();
  }

  async loadTelemetryHistory(): Promise<void> {
    try {
      const history = await this.telemetryService.getHistory(5);
      this.telemetryHistory.set(history);
    } catch (error) {
      console.error('[DriverProfileCard] Error loading telemetry history:', error);
      this.telemetryHistory.set([]);
    }
  }

  async onInitializeProfile(): Promise<void> {
    try {
      await this.driverProfileService.initializeProfile();
    } catch (_error) {
      console.error('[DriverProfileCard] Error al inicializar perfil:', _error);
    }
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

  getScoreBadgeColor(score: number): string {
    if (score >= 90) return 'success';
    if (score >= 80) return 'primary';
    if (score >= 70) return 'secondary';
    if (score >= 60) return 'warning';
    return 'danger';
  }
}
