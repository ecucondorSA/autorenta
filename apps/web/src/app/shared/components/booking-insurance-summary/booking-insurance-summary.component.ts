import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface InsuranceSummaryInput {
  coverageName?: string;
  premium?: number;
  guaranteeType?: string;
  guaranteeAmount?: number;
  currency?: 'ARS' | 'USD';
  notes?: string | null;
}

@Component({
  selector: 'app-booking-insurance-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-xl border border-border-default dark:border-neutral-800/60 bg-surface-raised dark:bg-surface-secondary p-4 space-y-3"
    >
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-text-primary">Cobertura y garantía</h3>
        <span class="text-xs text-text-secondary">{{ currencyLabel }}</span>
      </div>

      <div class="text-sm space-y-2">
        <div class="flex justify-between">
          <span>Cobertura</span>
          <span class="font-medium">{{ data.coverageName || 'Estándar' }}</span>
        </div>

        <div class="flex justify-between" *ngIf="data.premium !== undefined">
          <span>Prima</span>
          <span class="font-medium">{{ format(data.premium) }}</span>
        </div>

        <div class="flex justify-between" *ngIf="data.guaranteeAmount !== undefined">
          <span>Garantía ({{ data.guaranteeType || 'hold' }})</span>
          <span class="font-semibold">{{ format(data.guaranteeAmount) }}</span>
        </div>

        <div
          *ngIf="data.notes"
          class="text-xs text-text-secondary pt-2 border-t border-border-default/60 dark:border-neutral-700"
        >
          {{ data.notes }}
        </div>
      </div>
    </div>
  `,
})
export class BookingInsuranceSummaryComponent {
  @Input({ required: true }) data!: InsuranceSummaryInput;

  get currencyLabel(): string {
    return this.data?.currency === 'USD' ? 'USD' : 'ARS';
  }

  format(value: number | undefined): string {
    const amount = value ?? 0;
    const currency = this.data?.currency === 'USD' ? 'USD' : 'ARS';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
