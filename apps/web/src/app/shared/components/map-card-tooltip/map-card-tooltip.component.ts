import {
  Component,
  Input,
  ChangeDetectionStrategy,
  computed,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoneyPipe } from '../../pipes/money.pipe';
import { DistanceBadgeComponent } from '../distance-badge/distance-badge.component';
import type { CarMapLocation } from '../../../core/services/car-locations.service';

@Component({
  selector: 'app-map-card-tooltip',
  standalone: true,
  imports: [CommonModule, MoneyPipe, DistanceBadgeComponent],
  template: `
    <div
      class="map-tooltip-card bg-surface-raised dark:bg-surface-secondary rounded-lg shadow-xl border border-border-default dark:border-border-default overflow-hidden max-w-[280px] transition-all duration-200"
      [class.map-tooltip-card--selected]="selected"
    >
      <!-- Imagen del auto -->
      <div class="relative w-full aspect-[4/3] bg-surface-secondary overflow-hidden">
        <img
          *ngIf="car.photoUrl"
          [src]="car.photoUrl"
          [alt]="car.title"
          class="w-full h-full object-cover"
        />
        <div
          *ngIf="!car.photoUrl"
          class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-warning-light/10 to-cta-default/10"
        >
          <svg
            class="w-12 h-12 text-cta-default/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>

        <!-- Badge de confianza (si aplica) -->
        <div *ngIf="isVerified()" class="absolute top-2 right-2">
          <span
            class="inline-flex items-center gap-1 rounded-full bg-success-light/20 text-success-light border border-success-light/40 px-2 py-0.5 text-xs font-semibold"
          >
            <span>✓</span>
            <span>Verificado</span>
          </span>
        </div>
      </div>

      <!-- Contenido -->
      <div class="p-3 space-y-2">
        <!-- Título y ubicación -->
        <div>
          <h3
            class="text-sm font-semibold text-text-primary dark:text-text-inverse-pure line-clamp-1"
          >
            {{ car.title }}
          </h3>
          <p class="text-xs text-text-secondary dark:text-text-secondary mt-0.5">
            {{ car.locationLabel }}
          </p>
        </div>

        <!-- Precio -->
        <div class="flex items-baseline gap-1">
          <span class="text-xl font-bold text-cta-default">
            {{ car.pricePerDay | money: car.currency || 'ARS' }}
          </span>
          <span class="text-xs text-text-secondary dark:text-text-secondary">/día</span>
        </div>

        <!-- Badge de distancia (si está disponible) -->
        <div *ngIf="distanceKm() !== null" class="flex items-center gap-1">
          <app-distance-badge [distanceKm]="distanceKm()!" />
        </div>

        <!-- CTA -->
        <button
          type="button"
          (click)="onViewDetails()"
          class="w-full py-2 px-3 rounded-lg bg-cta-default text-cta-text text-sm font-semibold hover:bg-cta-default/90 transition-colors duration-200"
        >
          Ver detalles rápidos
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .map-tooltip-card {
        pointer-events: auto;
        cursor: pointer;
      }

      .map-tooltip-card--selected {
        ring: 2px;
        ring-color: rgb(44, 122, 123);
      }

      .line-clamp-1 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapCardTooltipComponent implements OnInit {
  @Input({ required: true }) car!: CarMapLocation;
  @Input() selected = false;
  @Input() userLocation?: { lat: number; lng: number };
  @Input() onViewDetailsClick?: (carId: string) => void;

  readonly distanceKm = signal<number | null>(null);

  readonly isVerified = computed(() => {
    // TODO: Integrar con verificación real cuando esté disponible
    return false;
  });

  ngOnInit(): void {
    if (this.userLocation && this.car.lat && this.car.lng) {
      const dist = this.calculateDistance(
        this.userLocation.lat,
        this.userLocation.lng,
        this.car.lat,
        this.car.lng,
      );
      this.distanceKm.set(dist);
    }
  }

  onViewDetails(): void {
    if (this.onViewDetailsClick) {
      this.onViewDetailsClick(this.car.carId);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
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
