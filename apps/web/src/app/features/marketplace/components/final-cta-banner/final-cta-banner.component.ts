import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * FinalCTABannerComponent - Conversion-focused closing banner
 *
 * Features:
 * - Dual CTA (rent / publish)
 * - Trust badges
 * - Gradient background
 * - Mobile-optimized layout
 */
@Component({
  selector: 'app-final-cta-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="cta-banner" aria-labelledby="cta-title">
      <div class="cta-content">
        <!-- Left: Copy -->
        <div class="cta-copy">
          <h2 id="cta-title" class="cta-title">
            {{ title }}
          </h2>
          <p class="cta-subtitle">
            {{ subtitle }}
          </p>

          <!-- Trust points -->
          <ul class="trust-points">
            @for (point of trustPoints; track point) {
              <li class="trust-point">
                <span class="trust-icon">✓</span>
                {{ point }}
              </li>
            }
          </ul>
        </div>

        <!-- Right: CTAs -->
        <div class="cta-buttons">
          <a [routerLink]="primaryCta.link" class="cta-btn primary" (click)="onPrimaryClick()">
            {{ primaryCta.label }}
          </a>
          <a
            [routerLink]="secondaryCta.link"
            class="cta-btn secondary"
            (click)="onSecondaryClick()"
          >
            {{ secondaryCta.label }}
          </a>
        </div>
      </div>

      <!-- Background decoration -->
      <div class="cta-decoration" aria-hidden="true">
        <div class="decoration-circle"></div>
        <div class="decoration-circle small"></div>
      </div>
    </section>
  `,
  styles: [
    `
      .cta-banner {
        position: relative;
        overflow: hidden;
        background: var(--cta-default); /* Reemplazado gradiente con color sólido */
        border-radius: var(--radius-2xl);
        padding: var(--space-10) var(--space-6);
        margin: var(--section-py) var(--space-4);

        @media (min-width: 768px) {
          padding: var(--space-12) var(--space-10);
          margin: var(--section-py) auto;
          max-width: 1200px;
        }
      }

      .cta-content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: var(--space-8);

        @media (min-width: 768px) {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
      }

      .cta-copy {
        flex: 1;
        max-width: 600px;
      }

      .cta-title {
        font-size: var(--text-xl);
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 var(--space-3);
        line-height: 1.2;

        @media (min-width: 768px) {
          font-size: var(--text-lg);
        }
      }

      .cta-subtitle {
        font-size: var(--text-lg);
        color: var(--text-secondary);
        margin: 0 0 var(--space-6);
        line-height: 1.5;
      }

      .trust-points {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3) var(--space-6);
      }

      .trust-point {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--text-primary);
        font-size: var(--text-sm);
        font-weight: 500;
      }

      .trust-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 50%;
        font-size: 12px;
      }

      /* CTAs */
      .cta-buttons {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        width: 100%;

        @media (min-width: 640px) {
          flex-direction: row;
          width: auto;
        }
      }

      .cta-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-4) var(--space-8);
        border-radius: var(--radius-lg);
        font-size: var(--text-base);
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s ease;
        white-space: nowrap;

        &.primary {
          background: var(--text-primary);
          color: white;

          &:hover {
            background: var(--neutral-100);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
        }

        &.secondary {
          background: transparent;
          color: var(--text-primary);
          border: 2px solid var(--text-primary);

          &:hover {
            background: rgba(0, 0, 0, 0.05);
            border-color: var(--text-primary);
          }
        }
      }

      /* Decoration */
      .cta-decoration {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        overflow: hidden;
      }

      .decoration-circle {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);

        &:first-child {
          width: 400px;
          height: 400px;
          top: -100px;
          right: -100px;
        }

        &.small {
          width: 200px;
          height: 200px;
          bottom: -50px;
          left: -50px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCTABannerComponent {
  @Input() title = '¿Listo para empezar?';
  @Input() subtitle =
    'Únete a miles de usuarios que ya disfrutan de la libertad de alquilar sin intermediarios.';

  @Input() trustPoints: string[] = [
    '100% Asegurado',
    'Pagos seguros',
    'Sin tarjeta de crédito',
    'Soporte 24/7',
  ];

  @Input() primaryCta = {
    label: 'Buscar autos',
    link: '/cars/list',
  };

  @Input() secondaryCta = {
    label: 'Publicar mi auto',
    link: '/cars/publish',
  };

  @Output() primaryClicked = new EventEmitter<void>();
  @Output() secondaryClicked = new EventEmitter<void>();

  onPrimaryClick(): void {
    this.primaryClicked.emit();
  }

  onSecondaryClick(): void {
    this.secondaryClicked.emit();
  }
}
