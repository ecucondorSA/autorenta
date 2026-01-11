import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  RiskCalculation,
  RiskCalculatorService,
} from '@core/services/verification/risk-calculator.service';

@Component({
  selector: 'app-risk-calculator-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './risk-calculator-viewer.component.html',
  styleUrls: ['./risk-calculator-viewer.component.scss'],
})
export class RiskCalculatorViewerComponent {
  readonly riskCalculation = input<RiskCalculation | null>(null);
  readonly carValueUsd = input<number>(0);

  private readonly riskCalculatorService = inject(RiskCalculatorService);

  readonly guaranteeCopy = computed(() => {
    const risk = this.riskCalculation();
    if (!risk) return null;
    return this.riskCalculatorService.getGuaranteeCopy(risk);
  });

  readonly franchiseTable = computed(() => {
    const risk = this.riskCalculation();
    if (!risk) return null;
    return this.riskCalculatorService.getFranchiseTable(risk);
  });

  getBucketLabel(bucket: string): string {
    const labels: Record<string, string> = {
      economy: 'Económico',
      standard: 'Estándar',
      premium: 'Premium',
      luxury: 'Lujo',
      'ultra-luxury': 'Ultra Lujo',
    };
    return labels[bucket] || bucket;
  }

  getBucketColor(bucket: string): string {
    switch (bucket) {
      case 'economy':
        return 'success';
      case 'standard':
        return 'primary';
      case 'premium':
        return 'warning';
      case 'luxury':
        return 'danger';
      case 'ultra-luxury':
        return 'tertiary';
      default:
        return 'medium';
    }
  }

  formatCurrency(amount: number, currency: 'USD' | 'ARS' = 'USD'): string {
    const locale = currency === 'ARS' ? 'es-AR' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  getClassColor(classNum: number): string {
    if (classNum <= 3) return 'success';
    if (classNum <= 6) return 'warning';
    return 'danger';
  }
}
