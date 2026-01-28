import {
  Component,
  input,
  output,
  signal,
  computed,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Price selection question
 * Features a slider with suggested price and earnings preview
 */
@Component({
  selector: 'app-price-question',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">
      <!-- Price display -->
      <div class="text-center">
        <div class="relative inline-block">
          <span class="text-2xl font-medium text-text-muted">US$</span>
          <input
            type="number"
            [(ngModel)]="priceValue"
            (ngModelChange)="onPriceChange($event)"
            [min]="minPrice"
            [max]="maxPrice"
            class="w-32 text-center text-5xl font-bold bg-transparent border-none focus:outline-none"
          />
          <span class="text-xl font-medium text-text-muted">/día</span>
        </div>
      </div>

      <!-- Slider -->
      <div class="px-4">
        <input
          type="range"
          [(ngModel)]="priceValue"
          (ngModelChange)="onPriceChange($event)"
          [min]="minPrice"
          [max]="maxPrice"
          step="1"
          class="w-full h-3 bg-surface-secondary rounded-full appearance-none cursor-pointer accent-cta-default"
        />
        <div class="flex justify-between text-xs text-text-muted mt-2">
          <span>US$ {{ minPrice }}</span>
          <span>US$ {{ maxPrice }}</span>
        </div>
      </div>

      <!-- Suggested price badge -->
      @if (suggestedPrice()) {
        <div class="text-center">
          <button
            type="button"
            (click)="useSuggestedPrice()"
            class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-sm font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:scale-105"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Precio sugerido: US$ {{ suggestedPrice() }}</span>
          </button>
          <p class="text-xs text-text-muted mt-2">Basado en vehículos similares en tu zona</p>
        </div>
      }

      <!-- Earnings preview -->
      @if (priceValue) {
        <div class="bg-surface-raised border border-border-default rounded-2xl p-6">
          <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            Estimación de ganancias
          </h3>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <p class="text-2xl font-bold text-text-primary">US$ {{ weeklyEarnings() }}</p>
              <p class="text-xs text-text-muted">Por semana</p>
            </div>
            <div class="border-x border-border-default">
              <p class="text-2xl font-bold text-cta-default">US$ {{ monthlyEarnings() }}</p>
              <p class="text-xs text-text-muted">Por mes</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-text-primary">US$ {{ yearlyEarnings() }}</p>
              <p class="text-xs text-text-muted">Por año</p>
            </div>
          </div>
          <p class="text-xs text-text-muted text-center mt-4">
            * Estimación basada en 50% de ocupación. Ya descontada la comisión de AutoRenta (15%).
          </p>
        </div>
      }

      <!-- Pricing strategy toggle -->
      <div class="flex items-center justify-center gap-4">
        <button
          type="button"
          (click)="setDynamicPricing(true)"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          [class.bg-cta-default]="isDynamicPricing()"
          [class.text-white]="isDynamicPricing()"
          [class.bg-surface-secondary]="!isDynamicPricing()"
          [class.text-text-secondary]="!isDynamicPricing()"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>Precio dinámico</span>
        </button>
        <button
          type="button"
          (click)="setDynamicPricing(false)"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          [class.bg-cta-default]="!isDynamicPricing()"
          [class.text-white]="!isDynamicPricing()"
          [class.bg-surface-secondary]="isDynamicPricing()"
          [class.text-text-secondary]="isDynamicPricing()"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14" />
          </svg>
          <span>Precio fijo</span>
        </button>
      </div>

      <!-- Dynamic pricing info -->
      @if (isDynamicPricing()) {
        <div class="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <svg class="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <div>
            <p class="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Precio dinámico activado
            </p>
            <p class="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              Tu precio se ajustará automáticamente según la demanda, temporada y eventos especiales.
              Propietarios con precio dinámico ganan en promedio <strong>20% más</strong>.
            </p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--color-cta-default);
        cursor: pointer;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transition: transform 0.15s;
      }

      input[type='range']::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }

      input[type='range']::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 50%;
        background: var(--color-cta-default);
        cursor: pointer;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      input[type='number']::-webkit-outer-spin-button,
      input[type='number']::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      input[type='number'] {
        -moz-appearance: textfield;
      }
    `,
  ],
})
export class PriceQuestionComponent implements OnInit, OnChanges {
  readonly fipeValue = input<number | null>(null);
  readonly mileage = input<number | null>(null);
  readonly year = input<number | null>(null);
  readonly initialValue = input<number | null>(null);
  readonly initialDynamicPricing = input<boolean>(true);

  readonly priceChanged = output<number>();
  readonly dynamicPricingChanged = output<boolean>();

  priceValue: number = 50;
  readonly minPrice = 10;
  readonly maxPrice = 500;

  readonly suggestedPrice = signal<number | null>(null);
  readonly isDynamicPricing = signal(true);
  readonly isCalculating = signal(false);

  readonly weeklyEarnings = computed(() => {
    // Modelo Comodato: 70% va al pool de rewards de comunidad
    // Estimación basada en ocupación 50% y participación en comunidad
    const dailyNet = this.priceValue * 0.70;
    return Math.round(dailyNet * 3.5); // 3.5 days per week at 50% occupancy
  });

  readonly monthlyEarnings = computed(() => {
    return Math.round(this.weeklyEarnings() * 4);
  });

  readonly yearlyEarnings = computed(() => {
    return Math.round(this.monthlyEarnings() * 12);
  });

  ngOnInit(): void {
    const initial = this.initialValue();
    if (initial) {
      this.priceValue = initial;
    }
    this.isDynamicPricing.set(this.initialDynamicPricing());
    this.calculateSuggestedPrice();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fipeValue'] || changes['mileage'] || changes['year']) {
      this.calculateSuggestedPrice();
    }
  }

  onPriceChange(value: number): void {
    this.priceValue = value;
    this.priceChanged.emit(value);
  }

  useSuggestedPrice(): void {
    const suggested = this.suggestedPrice();
    if (suggested) {
      this.priceValue = suggested;
      this.priceChanged.emit(suggested);
    }
  }

  setDynamicPricing(enabled: boolean): void {
    this.isDynamicPricing.set(enabled);
    this.dynamicPricingChanged.emit(enabled);
  }

  private async calculateSuggestedPrice(): Promise<void> {
    const fipeValue = this.fipeValue();
    const year = this.year();

    if (!fipeValue || !year) {
      // Use a default suggestion based on typical car values
      this.suggestedPrice.set(50);
      return;
    }

    this.isCalculating.set(true);

    try {
      // Simple calculation: ~2% of FIPE value / 30 days, adjusted for age
      const currentYear = new Date().getFullYear();
      const age = currentYear - year;
      const ageMultiplier = Math.max(0.7, 1 - age * 0.03); // 3% reduction per year, min 70%

      // Convert BRL to USD (approximate rate)
      const usdValue = fipeValue / 5;

      // Calculate daily rate (aim for 2% monthly return)
      const monthlyReturn = 0.02;
      const baseDaily = (usdValue * monthlyReturn) / 30;
      const adjustedDaily = baseDaily * ageMultiplier;

      // Round to nearest 5 and clamp
      const suggested = Math.round(adjustedDaily / 5) * 5;
      const clamped = Math.max(this.minPrice, Math.min(this.maxPrice, suggested));

      this.suggestedPrice.set(clamped);

      // Auto-select suggested if no initial value
      if (!this.initialValue()) {
        this.priceValue = clamped;
        this.priceChanged.emit(clamped);
      }
    } catch (error) {
      console.error('Failed to calculate suggested price:', error);
      this.suggestedPrice.set(50);
    } finally {
      this.isCalculating.set(false);
    }
  }
}
