import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { Booking } from '../../../core/models';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import {
  SettlementService,
  Claim,
} from '../../../core/services/settlement.service';
import {
  BookingInspection,
  BookingRiskSnapshot,
  EligibilityResult,
  WaterfallResult,
  FgoParameters,
  BucketType,
} from '../../../core/models/fgo-v1-1.model';
import { RiskMatrixService, RiskPolicy } from '../../../core/services/risk-matrix.service';
import { FgoService } from '../../../core/services/fgo.service';

/**
 * FgoManagementComponent
 *
 * This component encapsulates all logic related to the FGO (Fondo de Garantía Operativa).
 * It is responsible for displaying FGO-related information, such as guarantees, coverage, and waterfall steps.
 * It also handles FGO-related actions, such as uploading inspections and processing claims.
 * It receives a `Booking` object and the current exchange rate as inputs.
 */
@Component({
  selector: 'app-fgo-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Pricing Breakdown Card -->
    <section class="card-premium rounded-2xl p-4 sm:p-6 shadow-soft fgo-card">
      <div class="fgo-card__header">
        <h3 class="h5">🛡️ Garantías y cobertura FGO</h3>
        <span class="fgo-card__badge">{{ fgoEventCapUsdDisplay() }}</span>
      </div>

      <!-- 🇦🇷 Argentina Franchise Matrix Info -->
      <div
        class="fgo-card__hint"
        style="margin-bottom: 1.5rem; background: rgba(33, 150, 83, 0.08);"
      >
        <strong>Categoría del vehículo:</strong> {{ franchiseMatrix().bucket | uppercase }} ({{
          franchiseMatrix().carValueRange
        }})<br />
        <strong>Franquicia estándar:</strong> {{ formatUsd(franchiseMatrix().standardFranchiseUsd)
        }}<br />
        <strong>Franquicia por vuelco:</strong>
        {{ formatUsd(franchiseMatrix().rolloverFranchiseUsd) }}
      </div>

      <div class="fgo-card__stat-grid">
        <!-- Security Source (Card/Wallet) -->
        <div class="fgo-card__stat">
          <p class="fgo-card__stat-label">{{ securitySourceLabel() }}</p>

          <!-- For Credit Card: Show hold amount -->
          <p class="fgo-card__stat-value" *ngIf="securitySource() === 'card'">
            {{ formatUsd(holdAmountCard().usd) }}
          </p>
          <p
            class="fgo-card__stat-hint"
            *ngIf="securitySource() === 'card' && holdAmountCard().local !== null && exchangeRate"
          >
            Equivalente: {{ formatCurrency(holdAmountCard().local!, booking.currency) }}
          </p>
          <p class="fgo-card__stat-hint" *ngIf="securitySource() === 'card'">
            Hold calculado: 35% × franquicia vuelco × FX snapshot
          </p>

          <!-- For Wallet: Show security credit amount -->
          <p class="fgo-card__stat-value" *ngIf="securitySource() === 'wallet'">
            {{ formatUsd(walletSecurityCreditUsd()) }}
          </p>
          <p class="fgo-card__stat-hint" *ngIf="securitySource() === 'wallet' && exchangeRate">
            Equivalente:
            {{ formatCurrency(walletSecurityCreditUsd() * exchangeRate! * 100, booking.currency) }}
          </p>
          <p class="fgo-card__stat-hint" *ngIf="securitySource() === 'wallet'">
            Crédito de seguridad bloqueado en tu wallet
          </p>

          <!-- For Mixed or None -->
          <p
            class="fgo-card__stat-value"
            *ngIf="securitySource() === 'mixed' || securitySource() === 'none'"
          >
            {{ depositAmountUsdDisplay() ?? '—' }}
          </p>
          <p class="fgo-card__stat-hint" *ngIf="depositAmountLocalDisplay()">
            Equivalente: {{ depositAmountLocalDisplay() }}
          </p>
          <p class="fgo-card__stat-hint">{{ securitySourceDescription() }}</p>
        </div>

        <!-- FGO Maximum Coverage -->
        <div class="fgo-card__stat">
          <p class="fgo-card__stat-label">Cobertura máxima FGO</p>
          <p class="fgo-card__stat-value">{{ fgoEventCapUsdDisplay() }}</p>
          <p class="fgo-card__stat-hint" *ngIf="fgoEventCapLocalDisplay()">
            Equivalente: {{ fgoEventCapLocalDisplay() }}
          </p>
          <p class="fgo-card__stat-hint">
            Cubre daños hasta USD 800 por evento cuando la documentación está completa y RC ≥ 1.0.
          </p>
        </div>
      </div>

      <!-- 🇦🇷 Waterfall Payment Logic -->
      <div class="fgo-waterfall">
        <div class="fgo-step" *ngFor="let step of guaranteeWaterfallSteps(); let idx = index">
          <span class="fgo-step__marker">{{ idx + 1 }}</span>
          <div>
            <p class="fgo-step__title">{{ step.label }}</p>
            <p class="fgo-step__description">{{ step.description }}</p>
          </div>
        </div>
      </div>

      <div class="fgo-card__hint">
        ℹ️ El FGO interviene cuando la reserva está verificada, la evidencia está cargada y el fondo
        mantiene RC (Reserve Coverage) ≥ 1.0.
      </div>
    </section>
  `,
})
export class FgoManagementComponent implements OnInit {
  @Input({ required: true }) booking!: Booking;
  @Input() exchangeRate: number | null = null;

  private readonly fgoService = inject(FgoV1_1Service);
  private readonly settlementService = inject(SettlementService);
  private readonly riskMatrixService = inject(RiskMatrixService);
  private readonly fgoServiceV2 = inject(FgoService);

  readonly fgoParams = signal<FgoParameters | null>(null);
  readonly fgoLoading = signal(false);
  readonly inspections = signal<BookingInspection[]>([]);
  readonly riskSnapshot = signal<BookingRiskSnapshot | null>(null);
  readonly eligibility = signal<EligibilityResult | null>(null);
  readonly waterfallResult = signal<WaterfallResult | null>(null);
  readonly claimProcessing = signal(false);

  // 🇦🇷 Argentina FGO Constants
  readonly fgoEventCapUsd = computed(() => this.fgoParams()?.eventCapUsd ?? 800);
  readonly minWalletSecurityUsd = computed(() => 300);
  readonly recoveryWindowHours = computed(() => 72);

  // 🇦🇷 Car value estimation (nightly_rate × 125)
  readonly estimatedCarValueUsd = computed<number>(() => {
    const booking = this.booking;
    if (!booking) return 0;

    const nightlyRateCents =
      booking.nightly_rate_cents ?? booking.breakdown?.nightly_rate_cents ?? 0;
    const nightlyRateUsd = nightlyRateCents / 100;
    return nightlyRateUsd * 125;
  });

  // 🇦🇷 Franchise matrix based on car value (AR specific)
  readonly riskPolicy = signal<RiskPolicy | null>(null);

  readonly franchiseMatrix = computed<{
    bucket: 'economy' | 'standard' | 'premium' | 'luxury';
    carValueRange: string;
    standardFranchiseUsd: number;
    rolloverFranchiseUsd: number;
  }>(() => {
    const policy = this.riskPolicy();
    if (!policy) {
      return {
        bucket: 'economy',
        carValueRange: '≤ USD 10,000',
        standardFranchiseUsd: 500,
        rolloverFranchiseUsd: 1000,
      };
    }

    const franchise = this.riskMatrixService.calculateFranchise(policy);

    return {
      bucket: policy.bucket === 'standard' ? 'standard' : policy.bucket,
      carValueRange: Number.isFinite(policy.car_value_max)
        ? `$${policy.car_value_min.toLocaleString()} - $${policy.car_value_max.toLocaleString()}`
        : `≥ $${policy.car_value_min.toLocaleString()}`,
      standardFranchiseUsd: franchise.standard,
      rolloverFranchiseUsd: franchise.rollover,
    };
  });

  // 🇦🇷 Hold calculation for credit card (0.35 × rollover × FX)
  readonly holdAmountCard = computed<{ usd: number; local: number | null }>(() => {
    const policy = this.riskPolicy();
    if (!policy) return { usd: 0, local: null };

    const rollover = this.franchiseMatrix().rolloverFranchiseUsd;
    const holdUsd = 0.35 * rollover;

    const rate = this.exchangeRate;
    const localAmount = rate ? Math.round(holdUsd * rate * 100) : null;

    return {
      usd: holdUsd,
      local: localAmount,
    };
  });

  // 🇦🇷 Wallet security credit amount (USD 300 for ≤20k, USD 500 for >20k)
  readonly walletSecurityCreditUsd = computed<number>(
    () => this.riskPolicy()?.security_credit_usd ?? 0,
  );

  readonly securitySource = computed<'card' | 'wallet' | 'mixed' | 'none'>(() => {
    if (!this.booking) {
      return 'none';
    }

    switch (this.booking.payment_method) {
      case 'credit_card':
        return 'card';
      case 'wallet':
        return 'wallet';
      case 'partial_wallet':
        return 'mixed';
      default:
        return (this.booking.deposit_amount_cents ?? 0) > 0 ? 'wallet' : 'none';
    }
  });

  readonly securitySourceLabel = computed(() => {
    switch (this.securitySource()) {
      case 'card':
        return 'Hold en tarjeta';
      case 'wallet':
        return 'Crédito de seguridad';
      case 'mixed':
        return 'Hold + Wallet';
      default:
        return 'Garantía configurada';
    }
  });

  readonly securitySourceDescription = computed(() => {
    switch (this.securitySource()) {
      case 'card':
        return 'Se captura el hold cuando hay daños o ajustes pendientes.';
      case 'wallet':
        return 'Los fondos se bloquean en tu wallet como crédito no reembolsable.';
      case 'mixed':
        return 'Primero se usa el hold disponible y luego el crédito de seguridad.';
      default:
        return 'Asignamos la mejor combinación disponible para cubrir la franquicia.';
    }
  });

  readonly depositAmountUsd = computed<number | null>(() => {
    if (!this.booking) return null;

    const baseUsd = this.booking.deposit_amount_cents ? this.booking.deposit_amount_cents / 100 : 0;

    const walletFloor =
      this.securitySource() === 'wallet' || this.securitySource() === 'mixed'
        ? this.minWalletSecurityUsd()
        : 0;

    const effective = Math.max(baseUsd, walletFloor);
    return effective > 0 ? effective : null;
  });

  readonly depositAmountUsdDisplay = computed(() => {
    const amount = this.depositAmountUsd();
    if (!amount) return null;
    return this.formatUsd(amount);
  });

  readonly depositAmountLocalDisplay = computed(() => {
    const amount = this.depositAmountUsd();
    const rate = this.exchangeRate;
    if (!amount || !rate || !this.booking || this.booking.currency === 'USD') return null;
    const localCents = Math.round(amount * rate * 100);
    return this.formatCurrency(localCents, this.booking.currency);
  });

  readonly fgoEventCapUsdDisplay = computed(() => this.formatUsd(this.fgoEventCapUsd()));

  readonly fgoEventCapLocalDisplay = computed(() => {
    const rate = this.exchangeRate;
    if (!rate || !this.booking || this.booking.currency === 'USD') return null;
    const localCents = Math.round(this.fgoEventCapUsd() * rate * 100);
    return this.formatCurrency(localCents, this.booking.currency);
  });

  readonly guaranteeWaterfallSteps = computed(() => {
    const source = this.securitySource();
    const steps: Array<{ label: string; description: string }> = [];

    if (source === 'card') {
      const holdUsd = this.holdAmountCard().usd;
      steps.push({
        label: '1. Hold en tarjeta',
        description: `Se pre-autoriza un hold de ${this.formatUsd(holdUsd)} en tu tarjeta. Si hay daños, se captura el monto necesario.`,
      });
    } else {
      const creditUsd = this.walletSecurityCreditUsd();
      steps.push({
        label: '1. Crédito de Seguridad (Wallet)',
        description: `Se utiliza tu crédito de seguridad de ${this.formatUsd(creditUsd)} en wallet como garantía.`,
      });
    }

    steps.push({
      label: '2. Cobro adicional',
      description: `Si la garantía inicial no cubre los costos, se intentará un cobro adicional hasta el monto de la franquicia.`,
    });

    steps.push({
      label: '3. Cobertura FGO',
      description: `Si aún hay un saldo pendiente, el FGO cubre hasta ${this.formatUsd(this.fgoEventCapUsd())} si se cumplen las condiciones.`,
    });

    steps.push({
      label: '4. Proceso de Recupero',
      description: `AutoRenta iniciará un proceso de recupero por cualquier saldo restante.`,
    });

    return steps;
  });

  readonly canUploadInspection = computed(() => {
    return this.booking?.status === 'in_progress' || this.booking?.status === 'completed';
  });

  readonly hasCheckIn = computed(() => {
    return this.inspections().some((i) => i.stage === 'check_in' && i.signedAt);
  });

  readonly hasCheckOut = computed(() => {
    return this.inspections().some((i) => i.stage === 'check_out' && i.signedAt);
  });

  readonly hasClaim = computed(() => {
    return false;
  });

  async ngOnInit() {
    await this.loadFgoData();
    const carValue = this.estimatedCarValueUsd();
    try {
      const policy = await this.riskMatrixService.getRiskPolicy(carValue);
      this.riskPolicy.set(policy);
    } catch (error) {
      console.error('Error obteniendo política de riesgo:', error);
    }
  }

  private async loadFgoData(): Promise<void> {
    if (!this.booking) return;

    try {
      this.fgoLoading.set(true);

      const bucket = this.determineBucket(this.booking);
      const params = await firstValueFrom(this.fgoService.getParameters('AR', bucket));
      this.fgoParams.set(params);

      const snapshot = await firstValueFrom(this.fgoService.getRiskSnapshot(this.booking.id));
      this.riskSnapshot.set(snapshot);

      const inspections = await firstValueFrom(this.fgoService.getInspections(this.booking.id));
      this.inspections.set(inspections);
    } catch (error) {
      console.error('Error loading FGO data:', error);
    } finally {
      this.fgoLoading.set(false);
    }
  }

  private determineBucket(booking: Booking): BucketType {
    const nightlyRateCents =
      booking.nightly_rate_cents ?? booking.breakdown?.nightly_rate_cents ?? 0;
    const nightlyRateUsd = nightlyRateCents / 100;
    const estimatedCarValueUsd = nightlyRateUsd * 125;

    if (estimatedCarValueUsd < 10000) return 'economy';
    if (estimatedCarValueUsd < 30000) return 'default';
    if (estimatedCarValueUsd < 60000) return 'premium';
    return 'luxury';
  }

  async uploadCheckIn(): Promise<void> {
    alert('Funcionalidad en desarrollo');
  }

  async uploadCheckOut(): Promise<void> {
    alert('Funcionalidad en desarrollo');
  }

  async openClaimForm(): Promise<void> {
    alert('Funcionalidad en desarrollo');
  }

  private async processClaimWithWaterfall(claim: Claim): Promise<void> {
    this.claimProcessing.set(true);

    try {
      const eligibility = await this.settlementService.evaluateClaim(claim);
      this.eligibility.set(eligibility);

      if (!eligibility?.eligible) {
        alert(`Claim no elegible: ${eligibility?.reasons.join(', ')}`);
        return;
      }

      const confirmed = await this.confirmWaterfall(eligibility);
      if (!confirmed) return;

      const result = await this.settlementService.processClaim(claim);
      this.waterfallResult.set(result.waterfall ?? null);

      if (result.ok) {
        alert('Claim procesado exitosamente');
        await this.loadFgoData();
      } else {
        alert(`Error al procesar claim: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing claim:', error);
      alert('Error al procesar claim');
    } finally {
      this.claimProcessing.set(false);
    }
  }

  private async confirmWaterfall(eligibility: EligibilityResult): Promise<boolean> {
    const message = `
      Cobertura FGO
      Monto máximo cubierto: USD ${eligibility.maxCoverUsd?.toFixed(2) ?? 0}
      Franquicia aplicada: ${eligibility.franchisePercentage}%
      RC actual: ${eligibility.rc?.toFixed(2) ?? 'N/A'}
      Estado FGO: ${eligibility.rcStatus ?? 'N/A'}

      ¿Proceder con el waterfall de cobros?
    `.trim();

    return confirm(message);
  }

  formatUsd(amount: number): string {
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  }

  formatCurrency(cents: number, currency: string): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
