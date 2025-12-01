import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  signal,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoneyPipe } from '../../pipes/money.pipe';
import type { CarMapLocation } from '../../../core/services/car-locations.service';
import { CarLocationsService } from '../../../core/services/car-locations.service';
import { NavigationService } from '../../../core/services/navigation.service';

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
      *ngIf="car"
      class="enhanced-tooltip bg-surface-raised rounded-xl shadow-2xl border border-border-default overflow-hidden max-w-[320px] transition-all duration-200 hover:shadow-3xl"
      [class.enhanced-tooltip--selected]="selected"
    >
      <!-- Car Image -->
      <div class="relative w-full aspect-[16/9] bg-surface-raised overflow-hidden">
        <img
          *ngIf="car.photoUrl && !imageError()"
          [src]="car.photoUrl"
          [alt]="car.title || 'Auto'"
          class="w-full h-full object-cover"
          loading="lazy"
          (error)="onImageError()"
        />
        <div
          *ngIf="!car.photoUrl || imageError()"
          class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
        >
          <svg
            class="w-16 h-16 text-text-muted"
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
          <!-- Instant Booking Badge -->
          <span
            *ngIf="showInstantBookingBadge()"
            class="inline-flex items-center gap-1 rounded-full bg-success-light text-text-primary px-2.5 py-0.5 text-xs font-semibold shadow-sm"
            title="Reserva instantánea disponible"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Instantáneo</span>
          </span>

          <!-- Verified Badge -->
          <span
            *ngIf="isVerified()"
            class="inline-flex items-center gap-1 rounded-full bg-cta-default text-cta-text px-2.5 py-0.5 text-xs font-semibold shadow-sm"
            title="Auto verificado"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Verificado</span>
          </span>

          <!-- Reviews Badge (if has reviews) -->
          <span
            *ngIf="hasReviews()"
            class="inline-flex items-center gap-1 rounded-full bg-warning-light text-text-inverse px-2.5 py-0.5 text-xs font-semibold shadow-sm"
            title="{{ reviewCount() }} {{ reviewCount() === 1 ? 'reseña' : 'reseñas' }}"
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
          <span
            class="inline-flex items-center gap-1 rounded-full bg-surface-raised/95 backdrop-blur-sm text-text-primary px-2.5 py-1 text-xs font-semibold shadow-md"
          >
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
          <h3 class="text-base font-bold text-text-primary line-clamp-1 mb-0.5">
            {{ car.title || 'Auto' }}
          </h3>
          <p class="text-xs text-text-secondary flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            <span>{{ car.locationLabel || '' }}</span>
          </p>
        </div>

        <!-- Price -->
        <div class="flex items-baseline gap-1.5">
          <span class="h4 text-text-primary">
            {{ car.pricePerDay | money: car.currency || 'ARS' }}
          </span>
          <span class="text-sm text-text-secondary font-medium">/día</span>
        </div>

        <!-- CTAs -->
        <div class="flex flex-col gap-2">
          <!-- Primary CTA: Quick Book -->
          <button
            type="button"
            (click)="handleQuickBook($event)"
            class="w-full py-3 px-4 rounded-lg bg-cta-default hover:bg-cta-default text-cta-text text-sm font-semibold transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
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
            class="w-full py-2.5 px-4 rounded-lg bg-surface-raised hover:bg-surface-hover text-text-primary text-sm font-medium transition-colors duration-200"
          >
            Ver detalles
          </button>

          <!-- Navigate with Waze -->
          <button
            type="button"
            (click)="navigateWithWaze($event)"
            class="w-full flex items-center justify-center gap-1.5 bg-[var(--brand-waze-default,#33CCFF)] hover:bg-[var(--brand-waze-hover,#2BB8EA)] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 text-sm"
            title="Navegar con Waze"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"
              />
              <path
                d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"
              />
            </svg>
            <span>Cómo llegar</span>
          </button>
        </div>

        <!-- P2P Badge -->
        <div class="flex items-center justify-center gap-1 text-xs text-text-secondary pt-1">
          <svg class="w-3.5 h-3.5 text-success-light" fill="currentColor" viewBox="0 0 20 20">
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
        @apply ring-2 ring-cta-default;
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
export class EnhancedMapTooltipComponent implements OnInit, OnChanges {
  @Input({ required: true }) car: CarMapLocation | null = null;
  @Input() selected = false;
  @Input() userLocation?: { lat: number; lng: number };

  @Output() readonly quickBook = new EventEmitter<string>();
  @Output() readonly viewDetails = new EventEmitter<string>();

  private readonly carLocationsService = inject(CarLocationsService);
  private readonly navigationService = inject(NavigationService);

  readonly distanceKm = signal<number | null>(null);
  readonly reviewCount = signal<number>(0);
  readonly loadingReviews = signal(false);
  readonly imageError = signal(false);

  readonly isVerified = computed(() => {
    // Consider cars with photos and instant booking as "verified"
    // In the future, this could check owner verification status
    return !!(this.car?.photoUrl && this.car?.instantBooking);
  });

  readonly hasReviews = computed(() => {
    return this.reviewCount() > 0;
  });

  readonly showInstantBookingBadge = computed(() => {
    return this.car?.instantBooking === true;
  });

  ngOnChanges(changes: SimpleChanges): void {
    // Reset image error when car changes
    if (changes['car'] && this.car) {
      this.imageError.set(false);
    }
  }

  ngOnInit(): void {
    if (!this.car) {
      return;
    }

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

    // Fetch review count using cached service
    void this.loadReviewCount();
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  private async loadReviewCount(): Promise<void> {
    if (!this.car?.carId) {
      return;
    }

    this.loadingReviews.set(true);
    try {
      // Use CarLocationsService cache to avoid multiple queries
      const count = await this.carLocationsService.getReviewCount(this.car.carId);
      this.reviewCount.set(count);
    } catch (error) {
      console.warn('Error loading review count for tooltip:', error);
      // Keep default value of 0
    } finally {
      this.loadingReviews.set(false);
    }
  }

  handleQuickBook(event: Event): void {
    event.stopPropagation();
    if (this.car?.carId) {
      this.quickBook.emit(this.car.carId);
    }
  }

  handleViewDetails(event: Event): void {
    event.stopPropagation();
    if (this.car?.carId) {
      this.viewDetails.emit(this.car.carId);
    }
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

  /**
   * Navigate to car location using Waze
   */
  navigateWithWaze(event: Event): void {
    event.stopPropagation();

    if (!this.car) {
      return;
    }

    this.navigationService.navigateWithWaze({
      lat: this.car.lat,
      lng: this.car.lng,
      destinationName: this.car.title || 'Auto en ' + (this.car.locationLabel || 'AutoRenta'),
    });
  }
}
