import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Distance badge component
 * Displays distance with visual indicator
 * Shows "Cerca de ti" badge for distances < 5km
 */
@Component({
  selector: 'app-distance-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="distance-badge" [class]="badgeClass()">
      <span class="icon">📍</span>
      <span class="distance-text">{{ distanceText() }}</span>
      @if (isNearby()) {
        <span class="nearby-label">Cerca de ti</span>
      }
    </div>
  `,
  styles: [
    `
      .distance-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
        transition: all 0.2s;
      }

      .distance-badge.nearby {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }

      .distance-badge.medium {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }

      .distance-badge.far {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }

      .distance-badge.default {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #e5e7eb;
      }

      .distance-badge .icon {
        font-size: 0.875rem;
      }

      .distance-text {
        font-weight: 600;
      }

      .nearby-label {
        font-size: 0.625rem;
        padding: 0.125rem 0.375rem;
        background: #16a34a;
        color: white;
        border-radius: 9999px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }
    `,
  ],
})
export class DistanceBadgeComponent {
  @Input({ required: true }) distanceKm!: number;
  @Input() showTier: boolean = true;

  protected readonly distanceText = computed(() => {
    const km = this.distanceKm;
    if (km < 1) {
      const meters = Math.round(km * 1000);
      return `${meters} m`;
    } else {
      return `${km.toFixed(1)} km`;
    }
  });

  protected readonly isNearby = computed(() => {
    return this.distanceKm < 5;
  });

  protected readonly badgeClass = computed(() => {
    const km = this.distanceKm;
    if (km < 5) {
      return 'nearby';
    } else if (km < 20) {
      return 'medium';
    } else if (km < 50) {
      return 'far';
    } else {
      return 'default';
    }
  });
}
