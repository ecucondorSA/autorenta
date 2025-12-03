import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PricingBreakdownInput {
  nightlyRate: number;
  nights: number;
  fees?: number;
  discounts?: number;
  insurance?: number;
  total: number;
  currency?: 'ARS' | 'USD';
}

@Component({
  selector: 'app-booking-pricing-breakdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-xl border border-border-default dark:border-neutral-800/60 bg-surface-raised dark:bg-surface-secondary p-4 space-y-3"
    >
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-text-primary">Detalle de tarifa</h3>
        <span class="text-xs text-text-secondary">{{ currencyLabel }}</span>
      </div>

      <div class="text-sm space-y-2">
        <div class="flex justify-between">
          <span>Tarifa base ({{ data.nights }} noche{{ data.nights === 1 ? '' : 's' }})</span>
          <span class="font-medium">{{ format(data.nightlyRate * data.nights) }}</span>
        </div>

        <div class="flex justify-between" *ngIf="data.fees && data.fees !== 0">
          <span>Cargos / fees</span>
          <span class="font-medium">{{ format(data.fees) }}</span>
        </div>

        <div class="flex justify-between" *ngIf="data.insurance && data.insurance !== 0">
          <span>Seguro</span>
          <span class="font-medium">{{ format(data.insurance) }}</span>
        </div>

        <div class="flex justify-between" *ngIf="data.discounts && data.discounts !== 0">
          <span>Descuentos</span>
          <span class="font-medium text-success-light">-{{ format(abs(data.discounts)) }}</span>
        </div>

        <div class="h-px bg-border-default/60 dark:bg-neutral-700 my-2"></div>

        <div class="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{{ format(data.total) }}</span>
        </div>
      </div>
    </div>
  `,
})
export class BookingPricingBreakdownComponent {
  @Input({ required: true }) data!: PricingBreakdownInput;

  abs(value: number): number {
    return Math.abs(value);
  }

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
