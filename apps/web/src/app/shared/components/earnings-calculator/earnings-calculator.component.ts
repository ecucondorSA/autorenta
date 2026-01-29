import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FxService } from '@core/services/payments/fx.service';

/**
 * Super Calculadora de Ganancias - AutoRenta
 *
 * Features:
 * - Slider de valor del auto (dinámico)
 * - Slider de días disponibles
 * - Toggle de financiación con input de cuota
 * - Desglose transparente (comisión + seguro + lavados)
 * - Mensaje dinámico de coverage de cuota
 * - Health score visual (verde/amarillo)
 * - CTAs adaptativos
 */
@Component({
  selector: 'app-earnings-calculator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonicModule],
  templateUrl: './earnings-calculator.component.html',
  styleUrls: ['./earnings-calculator.component.scss'],
})
export class EarningsCalculatorComponent {
  private router = inject(Router);
  private fxService = inject(FxService);

  // Inputs (Signals)
  carValue = signal(15000000); // $15M default (typical sedan)
  daysAvailable = signal(15); // 15 days default (half month)
  isFinanced = signal(false);
  monthlyQuota = signal(0);

  // Constants
  private readonly DAILY_RATE_FACTOR = 0.003; // 0.3% of car value
  private readonly PLATFORM_FEE_PERCENT = 0.15; // 15%
  private readonly AVG_WASH_COST_ARS = 12000; // $12k per wash
  private readonly INSURANCE_BUFFER_ARS = 80000; // $80k insurance estimate

  // Computed Values
  estimatedDailyRate = computed(() => {
    const rawRate = this.carValue() * this.DAILY_RATE_FACTOR;
    const maxDailyRate = 150000; // Cap at $150k/day
    return Math.min(rawRate, maxDailyRate);
  });

  grossIncome = computed(() => {
    return this.estimatedDailyRate() * this.daysAvailable();
  });

  platformFee = computed(() => {
    return this.grossIncome() * this.PLATFORM_FEE_PERCENT;
  });

  estimatedWashes = computed(() => {
    return Math.ceil(this.daysAvailable() / 4); // 1 wash every 4 days
  });

  washingCost = computed(() => {
    return this.estimatedWashes() * this.AVG_WASH_COST_ARS;
  });

  insuranceBuffer = computed(() => {
    return this.INSURANCE_BUFFER_ARS;
  });

  operationalCost = computed(() => {
    return this.platformFee() + this.washingCost() + this.insuranceBuffer();
  });

  netResult = computed(() => {
    return Math.max(0, this.grossIncome() - this.operationalCost());
  });

  // Financing Logic
  healthScore = computed(() => {
    if (!this.isFinanced() || this.monthlyQuota() === 0) {
      return 'neutral';
    }

    const balance = this.netResult() - this.monthlyQuota();
    return balance >= 0 ? 'green' : 'yellow';
  });

  financingCoverage = computed(() => {
    if (this.monthlyQuota() === 0) return 0;
    return (this.netResult() / this.monthlyQuota()) * 100;
  });

  financingBalance = computed(() => {
    return this.netResult() - this.monthlyQuota();
  });

  missingDays = computed(() => {
    if (this.financingBalance() >= 0) return 0;
    const deficit = Math.abs(this.financingBalance());
    const dailyNetProfit = this.estimatedDailyRate() * (1 - this.PLATFORM_FEE_PERCENT - 0.1); // 10% buffer for other costs
    return Math.ceil(deficit / dailyNetProfit);
  });

  financingMessageTitle = computed(() => {
    const balance = this.financingBalance();
    if (balance >= 0) {
      return '¡Excelente! Tu auto se paga solo y genera extra';
    } else {
      return `Cubrís el ${Math.round(this.financingCoverage())}% de tu cuota`;
    }
  });

  financingMessageBody = computed(() => {
    const balance = this.financingBalance();
    if (balance >= 0) {
      return `Pagás tu cuota completa y te sobran $${this.formatNumber(balance)}. Tu auto es GRATIS.`;
    } else {
      return `Necesitás compartir ${this.missingDays()} días más al mes para cubrir el 100%.`;
    }
  });

  // UI Helpers
  getDaysLabel(): string {
    const days = this.daysAvailable();
    if (days <= 5) return 'Solo fines de semana';
    if (days <= 10) return 'Fines de semana + algunos días';
    if (days <= 15) return 'Medio mes';
    if (days <= 22) return 'La mayor parte del mes';
    return 'Casi todo el mes';
  }

  formatNumber(value: number): string {
    return Math.round(value).toLocaleString('es-AR');
  }

  pinFormatter = (value: number) => {
    return `$${(value / 1000000).toFixed(0)}M`;
  };

  getHealthColorClass(): string {
    const score = this.healthScore();
    if (score === 'green') return 'text-emerald-600';
    if (score === 'yellow') return 'text-amber-600';
    return 'text-gray-900';
  }

  getFinancingMessageClass(): string {
    const score = this.healthScore();
    if (score === 'green') {
      return 'bg-emerald-50 border-emerald-300 text-emerald-900';
    }
    return 'bg-amber-50 border-amber-300 text-amber-900';
  }

  getFinancingIcon(): string {
    return this.healthScore() === 'green' ? '✅' : '💡';
  }

  getCTAText(): string {
    if (!this.isFinanced()) {
      return 'Publicar mi Auto Ahora';
    }

    const score = this.healthScore();
    if (score === 'green') {
      return 'Empezar a Ganar Ahora';
    }
    return 'Hablar con un Asesor de Rentabilidad';
  }

  getCTAIcon(): string {
    if (!this.isFinanced() || this.healthScore() === 'green') {
      return 'rocket-outline';
    }
    return 'chatbubbles-outline';
  }

  getCTAClass(): string {
    if (!this.isFinanced() || this.healthScore() === 'green') {
      return 'bg-emerald-600 hover:bg-emerald-700 text-white';
    }
    return 'bg-blue-600 hover:bg-blue-700 text-white';
  }

  handleCTA(): void {
    if (!this.isFinanced() || this.healthScore() === 'green') {
      // Go to publish flow
      this.router.navigate(['/cars/publish']);
    } else {
      // Contact advisor (could open WhatsApp, support chat, etc.)
      this.router.navigate(['/contact'], {
        queryParams: {
          source: 'earnings_calculator',
          quota: this.monthlyQuota(),
          coverage: Math.round(this.financingCoverage()),
        },
      });
    }
  }
}
