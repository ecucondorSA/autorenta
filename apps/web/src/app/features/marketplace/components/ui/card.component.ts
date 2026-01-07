import { ChangeDetectionStrategy, Component, input } from '@angular/core';


/**
 * Card Component V2
 * Flexible card container with header, content, and footer slots
 *
 * Features:
 * - Elevation variants (flat, low, medium, high)
 * - Clickable variant with hover effects
 * - Optional header with title and actions
 * - Optional footer for actions
 * - Image support
 * - Skeleton loading state
 */
@Component({
  selector: 'app-marketplace-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div
      [class]="cardClasses()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? '0' : null"
    >
      <!-- Image (optional) -->
      @if (imageUrl()) {
        <div class="card-image">
          <img [src]="imageUrl()" [alt]="imageAlt() || 'Card image'" />
        </div>
      }

      <!-- Header (optional) -->
      <div class="card-header">
        <ng-content select="[cardHeader]" />
      </div>

      <!-- Content -->
      <div class="card-content">
        <ng-content />
      </div>

      <!-- Footer (optional) -->
      <div class="card-footer">
        <ng-content select="[cardFooter]" />
      </div>
    </div>
  `,
  styles: [
    `
      .card {
        display: flex;
        flex-direction: column;
        background: white;
        border-radius: 16px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Elevations */
      .card-flat {
        box-shadow: none;
        border: 1px solid var(--border-default, #e5e7eb);
      }

      .card-low {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .card-medium {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .card-high {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      /* Clickable variant */
      .card-clickable {
        cursor: pointer;
        user-select: none;
      }

      .card-clickable:hover {
        transform: translateY(-2px);
      }

      .card-clickable.card-low:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .card-clickable.card-medium:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      .card-clickable.card-high:hover {
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
      }

      .card-clickable:active {
        transform: scale(0.98);
      }

      /* Image */
      .card-image {
        width: 100%;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        background: var(--surface-light-subtle, #f3f4f6);
      }

      .card-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      .card-clickable:hover .card-image img {
        transform: scale(1.05);
      }

      /* Header */
      .card-header:empty {
        display: none;
      }

      .card-header {
        padding: 1rem 1rem 0;
      }

      /* Content */
      .card-content {
        padding: 1rem;
        flex: 1;
      }

      .card-header:not(:empty) + .card-content {
        padding-top: 0.5rem;
      }

      /* Footer */
      .card-footer:empty {
        display: none;
      }

      .card-footer {
        padding: 0 1rem 1rem;
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      /* Compact variant */
      .card-compact .card-header {
        padding: 0.75rem 0.75rem 0;
      }

      .card-compact .card-content {
        padding: 0.75rem;
      }

      .card-compact .card-footer {
        padding: 0 0.75rem 0.75rem;
      }

      /* Full bleed content */
      .card-full-bleed .card-content {
        padding: 0;
      }
    `,
  ],
})
export class MarketplaceCardComponent {
  // Props
  elevation = input<'flat' | 'low' | 'medium' | 'high'>('low');
  clickable = input<boolean>(false);
  compact = input<boolean>(false);
  fullBleed = input<boolean>(false);
  imageUrl = input<string | null>(null);
  imageAlt = input<string | null>(null);

  cardClasses(): string {
    const classes = ['card', `card-${this.elevation()}`];

    if (this.clickable()) classes.push('card-clickable');
    if (this.compact()) classes.push('card-compact');
    if (this.fullBleed()) classes.push('card-full-bleed');

    return classes.join(' ');
  }
}
