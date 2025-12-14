
import {Component, computed, input,
  ChangeDetectionStrategy} from '@angular/core';

/**
 * Distance badge component
 * Displays distance with visual indicator
 * Shows "Cerca de ti" badge for distances < 5km
 */
@Component({
  selector: 'app-distance-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
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
        background: var(--surface-success-light, #dcfce7);
        color: var(--text-success-dark, #166534);
        border: 1px solid var(--border-success-medium, #86efac);
      }

      .distance-badge.medium {
        background: var(--surface-warning-light, #fef3c7);
        color: var(--text-warning-dark, #92400e);
        border: 1px solid var(--border-warning-medium, #fde68a);
      }

      .distance-badge.far {
        background: var(--surface-error-light, #fee2e2);
        color: var(--text-error-dark, #991b1b);
        border: 1px solid var(--border-error-medium, #fecaca);
      }

      .distance-badge.default {
        background: var(--surface-light-subtle, #f3f4f6);
        color: var(--text-secondary, #374151);
        border: 1px solid var(--border-default, #e5e7eb);
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
        background: var(--success-default, #16a34a);
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
  readonly distanceKm = input.required<number>();
  readonly showTier = input<boolean>(true);

  protected readonly distanceText = computed(() => {
    const km = this.distanceKm();
    if (km < 1) {
      const meters = Math.round(km * 1000);
      return `${meters} m`;
    } else {
      return `${km.toFixed(1)} km`;
    }
  });

  protected readonly isNearby = computed(() => {
    return this.distanceKm() < 5;
  });

  protected readonly badgeClass = computed(() => {
    const km = this.distanceKm();
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
