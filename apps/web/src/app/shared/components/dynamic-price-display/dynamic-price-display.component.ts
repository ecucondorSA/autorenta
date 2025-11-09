import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DynamicPricingService,
  DynamicPricingResponse,
  PricingRequest,
} from '../../../core/services/dynamic-pricing.service';

@Component({
  selector: 'app-dynamic-price-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <!-- Loading State -->
      <div *ngIf="loading()" class="animate-pulse">
        <div class="h-8 bg-pearl-gray dark:bg-gray-700 rounded w-32"></div>
        <div class="h-4 bg-pearl-gray dark:bg-gray-700 rounded w-24 mt-2"></div>
      </div>

      <!-- Price Display -->
      <div *ngIf="!loading() && pricing()" class="space-y-2">
        <!-- Main Price -->
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-bold text-gray-900 dark:text-white-pure">
            {{ formatPrice(pricing()!.price_per_hour, pricing()!.currency) }}
          </span>
          <span class="text-sm text-charcoal-medium dark:text-pearl-light">/hora</span>
        </div>

        <!-- Total Price -->
        <div *ngIf="showTotal" class="text-sm text-charcoal-medium dark:text-pearl-light">
          Total:
          <span class="font-semibold">{{
            formatPrice(pricing()!.total_price, pricing()!.currency)
          }}</span>
          <span class="text-xs ml-1">({{ rentalHours }} horas)</span>
        </div>

        <!-- Surge Badge -->
        <div
          *ngIf="surgeBadge().show"
          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold {{
            surgeBadge().color
          }}"
        >
          <span>{{ surgeBadge().icon }}</span>
          <span>{{ surgeBadge().text }}</span>
        </div>

        <!-- Breakdown Toggle -->
        <button
          *ngIf="showBreakdown"
          type="button"
          (click)="breakdownExpanded.set(!breakdownExpanded())"
          class="text-sm text-sky-600 dark:text-teal-bright hover:underline flex items-center gap-1"
        >
          <span>Ver detalle</span>
          <svg
            class="w-4 h-4 transition-transform"
            [class.rotate-180]="breakdownExpanded()"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <!-- Breakdown Details -->
        <div
          *ngIf="showBreakdown && breakdownExpanded()"
          class="mt-3 p-4 rounded-lg bg-sand-light/50 dark:bg-gray-700/30 space-y-2.5 text-sm"
        >
          <!-- Base Price -->
          <div
            class="flex justify-between items-center pb-2 border-b border-pearl-gray dark:border-charcoal-medium"
          >
            <span class="text-charcoal-medium dark:text-pearl-light">Tarifa base</span>
            <span class="font-semibold text-gray-900 dark:text-white-pure">
              {{ formatPrice(pricing()!.breakdown.base_price, pricing()!.currency) }}
            </span>
          </div>

          <!-- Factors -->
          <div *ngFor="let factor of getVisibleFactors()" class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="text-charcoal-medium dark:text-pearl-light">{{ factor.label }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded"
                [class.bg-green-100]="factor.value < 0"
                [class.text-green-700]="factor.value < 0"
                [class.bg-amber-100]="factor.value > 0"
                [class.text-amber-700]="factor.value > 0"
                [class.bg-gray-100]="factor.value === 0"
                [class.text-gray-600 dark:text-gray-300]="factor.value === 0"
              >
                {{ formatFactor(factor.value) }}
              </span>
            </div>
            <span class="text-sm text-charcoal-medium dark:text-pearl-light">{{
              factor.description
            }}</span>
          </div>

          <!-- Total Multiplier -->
          <div
            class="flex justify-between items-center pt-2 border-t border-pearl-gray dark:border-charcoal-medium font-semibold"
          >
            <span class="text-gray-900 dark:text-white-pure">Multiplicador total</span>
            <span
              class="text-lg"
              [class.text-green-600]="pricing()!.breakdown.total_multiplier < 1"
              [class.text-amber-600]="pricing()!.breakdown.total_multiplier > 1.1"
              [class.text-gray-900]="
                pricing()!.breakdown.total_multiplier >= 1 &&
                pricing()!.breakdown.total_multiplier <= 1.1
              "
              [class.dark:text-white-pure]="
                pricing()!.breakdown.total_multiplier >= 1 &&
                pricing()!.breakdown.total_multiplier <= 1.1
              "
            >
              ×{{ pricing()!.breakdown.total_multiplier.toFixed(2) }}
            </span>
          </div>

          <!-- Context Info -->
          <div
            class="mt-3 pt-3 border-t border-pearl-gray dark:border-charcoal-medium text-xs text-charcoal-medium dark:text-pearl-light/70"
          >
            <p>
              {{ getDayName(pricing()!.details.day_of_week) }} •
              {{ getHourDescription(pricing()!.details.hour_of_day) }}
            </p>
            <p *ngIf="pricing()!.details.user_rentals > 0" class="mt-1">
              Has completado {{ pricing()!.details.user_rentals }} alquileres
            </p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="text-sm text-red-600 dark:text-red-400">
        {{ error() }}
      </div>
    </div>
  `,
  styles: [],
})
export class DynamicPriceDisplayComponent implements OnInit, OnDestroy {
  private readonly pricingService = inject(DynamicPricingService);

  // Inputs
  @Input({ required: true }) regionId!: string;
  @Input({ required: true }) rentalStart!: string; // ISO timestamp
  @Input({ required: true }) rentalHours!: number;
  @Input() carId?: string;
  @Input() showTotal = true;
  @Input() showBreakdown = true;
  @Input() autoRefresh = false; // Auto-refresh every 5 minutes
  @Input() refreshInterval = 5 * 60 * 1000; // 5 minutes

  // State
  readonly loading = signal(false);
  readonly pricing = signal<DynamicPricingResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly breakdownExpanded = signal(false);

  private refreshTimer?: number;

  ngOnInit(): void {
    void this.loadPricing();

    if (this.autoRefresh) {
      this.refreshTimer = window.setInterval(() => {
        void this.loadPricing();
      }, this.refreshInterval);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  async loadPricing(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const request: PricingRequest = {
        region_id: this.regionId,
        rental_start: this.rentalStart,
        rental_hours: this.rentalHours,
        car_id: this.carId,
      };

      const result = await this.pricingService.calculatePrice(request);
      this.pricing.set(result);
    } catch (_err) {
      this.error.set('No se pudo calcular el precio. Intenta nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }

  formatPrice(amount: number, currency: string): string {
    return this.pricingService.formatPrice(amount, currency);
  }

  formatFactor(factor: number): string {
    return this.pricingService.formatFactor(factor);
  }

  getDayName(dayOfWeek: number): string {
    return this.pricingService.getDayName(dayOfWeek);
  }

  getHourDescription(hour: number): string {
    return this.pricingService.getHourDescription(hour);
  }

  surgeBadge(): { show: boolean; text: string; color: string; icon: string } {
    return this.pricing()
      ? this.pricingService.getSurgeBadge(this.pricing()!)
      : { show: false, text: '', color: '', icon: '' };
  }

  getVisibleFactors(): Array<{ label: string; value: number; description: string }> {
    if (!this.pricing()) return [];

    const breakdown = this.pricing()!.breakdown;
    const labels = this.pricingService.getBreakdownLabels();

    return [
      {
        label: labels.day_factor,
        value: breakdown.day_factor,
        description: this.getDayName(this.pricing()!.details.day_of_week),
      },
      {
        label: labels.hour_factor,
        value: breakdown.hour_factor,
        description: this.getHourDescription(this.pricing()!.details.hour_of_day),
      },
      {
        label: labels.user_factor,
        value: breakdown.user_factor,
        description: this.getUserTypeDescription(),
      },
      {
        label: labels.demand_factor,
        value: breakdown.demand_factor,
        description: this.getDemandDescription(),
      },
      {
        label: labels.event_factor,
        value: breakdown.event_factor,
        description: breakdown.event_factor > 0 ? 'Evento especial' : 'Sin eventos',
      },
    ].filter((f) => f.value !== 0 || this.breakdownExpanded());
  }

  private getUserTypeDescription(): string {
    const rentals = this.pricing()?.details.user_rentals || 0;
    if (rentals === 0) return 'Usuario nuevo';
    if (rentals >= 10) return 'Usuario frecuente';
    return `${rentals} alquileres`;
  }

  private getDemandDescription(): string {
    const factor = this.pricing()?.breakdown.demand_factor || 0;
    if (factor > 0.2) return 'Demanda muy alta';
    if (factor > 0.1) return 'Demanda alta';
    if (factor < -0.05) return 'Demanda baja';
    return 'Demanda normal';
  }
}
