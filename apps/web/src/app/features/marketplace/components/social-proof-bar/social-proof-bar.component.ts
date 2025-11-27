import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import type { SocialProofStat } from '../../../../core/models/marketplace.model';

/**
 * SocialProofBarComponent - Animated stats counter bar
 *
 * Features:
 * - Animated counting effect on scroll into view
 * - Intersection Observer for visibility detection
 * - Configurable animation duration
 * - Responsive layout
 */
@Component({
  selector: 'app-social-proof-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      #container
      class="social-proof-bar"
      [class.animated]="hasAnimated()"
      aria-label="Estadísticas de la plataforma"
    >
      <div class="stats-container">
        @for (stat of stats; track stat.id) {
          <div class="stat-item">
            <div class="stat-value">
              @if (stat.prefix) {
                <span class="stat-prefix">{{ stat.prefix }}</span>
              }
              <span class="stat-number">{{ animatedValues()[stat.id] | number : '1.0-0' }}</span>
              @if (stat.suffix) {
                <span class="stat-suffix">{{ stat.suffix }}</span>
              }
            </div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .social-proof-bar {
        background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
        padding: var(--space-6) var(--space-4);
        border-radius: var(--radius-xl);
        margin: var(--space-8) 0;
        box-shadow: var(--shadow-lg);

        /* Dark mode */
        :host-context(.dark) & {
          background: linear-gradient(135deg, var(--primary-700) 0%, var(--primary-800) 100%);
        }
      }

      .stats-container {
        display: flex;
        justify-content: space-around;
        align-items: center;
        gap: var(--space-4);
        max-width: 1000px;
        margin: 0 auto;
        flex-wrap: wrap;
      }

      .stat-item {
        text-align: center;
        min-width: 100px;
        padding: var(--space-2);
      }

      .stat-value {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 2px;
        font-size: var(--text-3xl);
        font-weight: 700;
        color: white;
        line-height: 1.2;

        @media (min-width: 768px) {
          font-size: var(--text-4xl);
        }
      }

      .stat-prefix,
      .stat-suffix {
        font-size: var(--text-xl);
        opacity: 0.9;
      }

      .stat-number {
        font-variant-numeric: tabular-nums;
      }

      .stat-label {
        font-size: var(--text-sm);
        color: rgba(255, 255, 255, 0.9);
        margin-top: var(--space-1);
        font-weight: 500;
      }

      /* Animation */
      .social-proof-bar:not(.animated) .stat-number {
        opacity: 0;
        transform: translateY(10px);
      }

      .social-proof-bar.animated .stat-number {
        opacity: 1;
        transform: translateY(0);
        transition:
          opacity 0.5s ease-out,
          transform 0.5s ease-out;
      }

      /* Responsive */
      @media (max-width: 640px) {
        .stats-container {
          gap: var(--space-2);
        }

        .stat-item {
          min-width: 80px;
        }

        .stat-value {
          font-size: var(--text-2xl);
        }

        .stat-label {
          font-size: var(--text-xs);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProofBarComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input() stats: SocialProofStat[] = [
    { id: 'cars', value: 500, label: 'Autos disponibles', icon: '🚗', suffix: '+' },
    { id: 'users', value: 10000, label: 'Usuarios activos', icon: '👥', suffix: '+' },
    { id: 'rentals', value: 25000, label: 'Alquileres completados', icon: '✅', suffix: '+' },
    { id: 'rating', value: 4.8, label: 'Calificación promedio', icon: '⭐', prefix: '' },
  ];

  @Input() animationDuration = 2000; // ms

  readonly hasAnimated = signal(false);
  readonly animatedValues = signal<Record<string, number>>({});

  private observer?: IntersectionObserver;
  private animationFrameId?: number;

  ngOnInit(): void {
    // Initialize values to 0
    const initialValues: Record<string, number> = {};
    for (const stat of this.stats) {
      initialValues[stat.id] = 0;
    }
    this.animatedValues.set(initialValues);

    if (this.isBrowser) {
      this.setupIntersectionObserver();
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !this.hasAnimated()) {
            this.startAnimation();
            this.observer?.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );

    this.observer.observe(this.container.nativeElement);
  }

  private startAnimation(): void {
    this.hasAnimated.set(true);

    const startTime = performance.now();
    const duration = this.animationDuration;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const newValues: Record<string, number> = {};
      for (const stat of this.stats) {
        newValues[stat.id] = Math.round(stat.value * easeProgress * 10) / 10;
      }
      this.animatedValues.set(newValues);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        // Ensure final values are exact
        const finalValues: Record<string, number> = {};
        for (const stat of this.stats) {
          finalValues[stat.id] = stat.value;
        }
        this.animatedValues.set(finalValues);
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }
}
