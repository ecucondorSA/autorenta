import { CommonModule } from '@angular/common';
import {Component, Input, inject, signal, OnInit,
  ChangeDetectionStrategy} from '@angular/core';
import { BonusMalusService } from '@core/services/payments/bonus-malus.service';
import type { BonusMalusDisplay } from '../../../core/models';

export interface PricingBreakdownInput {
  nightlyRate: number;
  nights: number;
  fees?: number;
  discounts?: number;
  insurance?: number;
  total: number;
  currency?: 'ARS' | 'USD';
  bonusMalusFactor?: number; // Optional: If provided, will show bonus-malus info
}

@Component({
  selector: 'app-booking-pricing-breakdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    
        @if (data.fees && data.fees !== 0) {
          <div class="flex justify-between">
            <span>Cargos / fees</span>
            <span class="font-medium">{{ format(data.fees) }}</span>
          </div>
        }
    
        @if (data.insurance && data.insurance !== 0) {
          <div class="flex justify-between">
            <span>Seguro</span>
            <span class="font-medium">{{ format(data.insurance) }}</span>
          </div>
        }
    
        @if (data.discounts && data.discounts !== 0) {
          <div class="flex justify-between">
            <span>Descuentos</span>
            <span class="font-medium text-success-strong">-{{ format(abs(data.discounts)) }}</span>
          </div>
        }
    
        <!-- Bonus-Malus Display -->
        @if (bonusMalusDisplay()) {
          <div class="flex items-center justify-between py-1 px-2 rounded-lg"
             [ngClass]="{
               'bg-success-light/10': bonusMalusDisplay()?.type === 'BONUS',
               'bg-warning-light/10': bonusMalusDisplay()?.type === 'MALUS',
               'bg-surface-base': bonusMalusDisplay()?.type === 'NEUTRAL'
             }">
            <span class="flex items-center gap-1.5 text-sm">
              <span>{{ bonusMalusDisplay()?.icon }}</span>
              <span [ngClass]="bonusMalusDisplay()?.color">{{ bonusMalusDisplay()?.message }}</span>
            </span>
            <button
              type="button"
              class="text-xs text-cta-default hover:underline"
              (click)="showBonusMalusTips = !showBonusMalusTips">
              {{ showBonusMalusTips ? 'Ocultar' : 'Info' }}
            </button>
          </div>
        }
    
        <!-- Bonus-Malus Tips (expandible) -->
        @if (showBonusMalusTips && bonusMalusDisplay()?.tips?.length) {
          <div
            class="text-xs text-text-secondary space-y-1 p-2 bg-surface-base rounded-lg">
            @for (tip of bonusMalusDisplay()!.tips; track tip) {
              <p class="flex items-start gap-1">
                <span class="text-cta-default">•</span>
                <span>{{ tip }}</span>
              </p>
            }
          </div>
        }
    
        <div class="h-px bg-border-default/60 dark:bg-neutral-700 my-2"></div>
    
        <div class="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{{ format(data.total) }}</span>
        </div>
      </div>
    </div>
    `,
})
export class BookingPricingBreakdownComponent implements OnInit {
  @Input({ required: true }) data!: PricingBreakdownInput;

  private readonly bonusMalusService = inject(BonusMalusService);

  readonly bonusMalusDisplay = signal<BonusMalusDisplay | null>(null);
  showBonusMalusTips = false;

  ngOnInit(): void {
    // Load bonus-malus display if factor is provided or load from service
    this.loadBonusMalus();
  }

  private async loadBonusMalus(): Promise<void> {
    try {
      if (this.data?.bonusMalusFactor !== undefined) {
        // Use provided factor
        const display = this.bonusMalusService.getBonusMalusDisplay(this.data.bonusMalusFactor);
        this.bonusMalusDisplay.set(display);
      } else {
        // Load from service for current user
        const factor = await this.bonusMalusService.getBonusMalusFactor();
        if (factor !== 0) {
          const display = this.bonusMalusService.getBonusMalusDisplay(factor);
          this.bonusMalusDisplay.set(display);
        }
      }
    } catch {
      // Silent fail - bonus-malus is optional
    }
  }

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
