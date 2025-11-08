import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoneyPipe } from '../../pipes/money.pipe';
import type { CarMapLocation } from '../../../core/services/car-locations.service';

/**
 * Enhanced Map Tooltip Component
 *
 * Optimized for conversion with:
 * - Larger, more visual design (max-width: 320px)
 * - Prominent car image
 * - Clear pricing with distance badge
 * - Primary CTA: "Alquilar ahora" (P2P without credit card)
 * - Secondary CTA: "Ver detalles"
 * - Trust indicators (verified, reviews)
 * - Neutral, professional design
 */
@Component({
  selector: 'app-enhanced-map-tooltip',
  standalone: true,
  imports: [CommonModule, MoneyPipe],
  template: `
    <div
      class="enhanced-tooltip bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-w-[320px] transition-all duration-200 hover:shadow-3xl"
      [class.enhanced-tooltip--selected]="selected"
    >
      <!-- Car Image -->
      <div class="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
        <img
          *ngIf="car.photoUrl"
          [src]="car.photoUrl"
          [alt]="car.title"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <div
          *ngIf="!car.photoUrl"
          class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
        >
          <svg
            class="w-16 h-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>

        <!-- Trust Badges (Top Right) -->
        <div class="absolute top-2 right-2 flex flex-col gap-1">
          <!-- Verified Badge -->
          <span
            *ngIf="isVerified()"
            class="inline-flex items-center gap-1 rounded-full bg-green-500 text-white px-2.5 py-0.5 text-xs font-semibold shadow-sm"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Verificado</span>
          </span>

          <!-- Reviews Badge (if has reviews) -->
          <span
            *ngIf="hasReviews()"
            class="inline-flex items-center gap-1 rounded-full bg-blue-500 text-white px-2.5 py-0.5 text-xs font-semibold shadow-sm"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
            <span>{{ reviewCount() }}</span>
          </span>
        </div>

        <!-- Distance Badge (Bottom Left) -->
        <div *ngIf="distanceKm() !== null" class="absolute bottom-2 left-2">
          <span class="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-sm text-gray-800 px-2.5 py-1 text-xs font-semibold shadow-md">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{{ formatDistance(distanceKm()!) }}</span>
          </span>
        </div>
      </div>

      <!-- Content -->
      <div class="p-4 space-y-3">
        <!-- Title & Location -->
        <div>
          <h3 class="text-base font-bold text-gray-900 line-clamp-1 mb-0.5">
            {{ car.title }}
          </h3>
          <p class="text-xs text-gray-600 flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            <span>{{ car.locationLabel }}</span>
          </p>
        </div>

        <!-- Price -->
        <div class="flex items-baseline gap-1.5">
          <span class="text-2xl font-bold text-gray-900">
            {{ car.pricePerDay | money: (car.currency || 'ARS') }}
          </span>
          <span class="text-sm text-gray-600 font-medium">/día</span>
        </div>

        <!-- CTAs -->
        <div class="flex flex-col gap-2">
          <!-- Primary CTA: Quick Book -->
          <button
            type="button"
            (click)="handleQuickBook($event)"
            class="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Alquilar ahora</span>
          </button>

          <!-- Secondary CTA: View Details -->
          <button
            type="button"
            (click)="handleViewDetails($event)"
            class="w-full py-2.5 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium transition-colors duration-200"
          >
            Ver detalles
          </button>
        </div>

        <!-- P2P Badge -->
        <div class="flex items-center justify-center gap-1 text-xs text-gray-600 pt-1">
          <svg class="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="font-medium">Sin tarjeta de crédito</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .enhanced-tooltip {
        pointer-events: auto;
        cursor: default;
      }

      .enhanced-tooltip--selected {
        @apply ring-2 ring-blue-500;
      }

      .line-clamp-1 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
      }

      /* Smooth animation on appear */
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .enhanced-tooltip {
        animation: slideUp 0.2s ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnhancedMapTooltipComponent implements OnInit {
  @Input({ required: true }) car!: CarMapLocation;
  @Input() selected = false;
  @Input() userLocation?: { lat: number; lng: number };

  @Output() readonly quickBook = new EventEmitter<string>();
  @Output() readonly viewDetails = new EventEmitter<string>();

  readonly distanceKm = signal<number | null>(null);
  readonly reviewCount = signal<number>(0);

  readonly isVerified = computed(() => {
    // TODO: Integrate with real verification when available
    // For now, consider cars with photos as "verified"
    return !!this.car.photoUrl;
  });

  readonly hasReviews = computed(() => {
    return this.reviewCount() > 0;
  });

  ngOnInit(): void {
    // Calculate distance if user location is available
    if (this.userLocation && this.car.lat && this.car.lng) {
      const dist = this.calculateDistance(
        this.userLocation.lat,
        this.userLocation.lng,
        this.car.lat,
        this.car.lng,
      );
      this.distanceKm.set(dist);
    }

    // TODO: Fetch review count from reviews service
    // For now, set to 0
    this.reviewCount.set(0);
  }

  handleQuickBook(event: Event): void {
    event.stopPropagation();
    this.quickBook.emit(this.car.carId);
  }

  handleViewDetails(event: Event): void {
    event.stopPropagation();
    this.viewDetails.emit(this.car.carId);
  }

  formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    } else if (km < 10) {
      return `${km.toFixed(1)}km`;
    } else {
      return `${Math.round(km)}km`;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
