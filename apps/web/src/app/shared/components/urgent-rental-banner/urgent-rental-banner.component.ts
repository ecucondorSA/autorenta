import { Component, Input, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  UrgentRentalService,
  UrgentRentalAvailability,
  UrgentRentalQuote,
} from '../../../core/services/urgent-rental.service';
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';

@Component({
  selector: 'app-urgent-rental-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="expressMode() && availability()"
      class="bg-gradient-to-r from-accent-petrol/10 via-accent-warm/10 to-accent-petrol/10 border-2 border-accent-petrol/30 rounded-xl p-4 mb-4 animate-pulse-subtle"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <svg
            class="w-6 h-6 text-accent-petrol animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h4 class="font-bold text-accent-petrol text-lg">🚀 Modo Express</h4>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-accent-petrol">
            {{
              quote()?.hourlyRate
                ? (quote()!.hourlyRate | currency: 'ARS' : 'symbol' : '1.0-0')
                : '...'
            }}
          </div>
          <div class="text-xs text-charcoal-medium dark:text-pearl-light">/hora</div>
        </div>
      </div>

      <!-- Estado de disponibilidad -->
      <div *ngIf="availability()?.available" class="flex items-center gap-4 text-sm mb-3">
        <span
          *ngIf="availability()!.distance"
          class="flex items-center gap-1.5 text-accent-petrol font-semibold"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clip-rule="evenodd"
            />
          </svg>
          A {{ formatDistance(availability()!.distance!) }} de distancia
        </span>
        <span
          *ngIf="availability()!.eta"
          class="flex items-center gap-1.5 text-accent-warm font-semibold"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clip-rule="evenodd"
            />
          </svg>
          Llega en {{ formatTime(availability()!.eta!) }}
        </span>
        <span
          *ngIf="availability()!.batteryLevel !== undefined"
          class="flex items-center gap-1.5 text-green-600 font-semibold"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M3.5 2.75a.75.75 0 00-1.5 0v12.5a2 2 0 002 2h14.5a.75.75 0 000-1.5H3.5v-1h14.5a.75.75 0 000-1.5H3.5v-1h14.5a.75.75 0 000-1.5H3.5V2.75z"
              clip-rule="evenodd"
            />
          </svg>
          {{ availability()!.batteryLevel }}% batería
        </span>
      </div>

      <!-- Mensaje de no disponibilidad -->
      <div
        *ngIf="!availability()?.available"
        class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
      >
        <p class="font-semibold">⚠️ No disponible ahora</p>
        <p *ngIf="availability()?.reason">{{ availability()!.reason }}</p>
      </div>

      <!-- Loading state -->
      <div
        *ngIf="loading()"
        class="flex items-center gap-2 text-sm text-charcoal-medium dark:text-pearl-light"
      >
        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>Verificando disponibilidad...</span>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes pulse-subtle {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.95;
        }
      }
      .animate-pulse-subtle {
        animation: pulse-subtle 3s ease-in-out infinite;
      }
    `,
  ],
})
export class UrgentRentalBannerComponent implements OnInit, OnDestroy {
  private readonly urgentRentalService = inject(UrgentRentalService);
  private readonly pricingService = inject(DynamicPricingService);

  @Input({ required: true }) carId!: string;
  @Input({ required: true }) regionId!: string;
  @Input({ required: true }) expressMode!: ReturnType<typeof signal<boolean>>;

  readonly availability = signal<UrgentRentalAvailability | null>(null);
  readonly quote = signal<UrgentRentalQuote | null>(null);
  readonly loading = signal(false);

  private checkInterval?: number;

  ngOnInit(): void {
    if (this.expressMode()) {
      void this.checkAvailability();
      void this.loadQuote();
      // Verificar cada 30 segundos
      this.checkInterval = window.setInterval(() => {
        void this.checkAvailability();
      }, 30000);
    }
  }

  ngOnDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  async checkAvailability(): Promise<void> {
    this.loading.set(true);
    try {
      const avail = await this.urgentRentalService.checkImmediateAvailability(this.carId);
      this.availability.set(avail);
    } catch (_error) {
      console.error('Error checking availability:', _error);
      this.availability.set({
        available: false,
        reason: 'Error al verificar disponibilidad',
      });
    } finally {
      this.loading.set(false);
    }
  }

  async loadQuote(): Promise<void> {
    try {
      const quote = await this.urgentRentalService.getUrgentQuote(this.carId, this.regionId, 1);
      this.quote.set(quote);
    } catch (_error) {
      console.error('Error loading quote:', _error);
    }
  }

  formatDistance(km: number): string {
    return this.urgentRentalService.formatDistance(km);
  }

  formatTime(minutes: number): string {
    return this.urgentRentalService.formatTime(minutes);
  }
}
