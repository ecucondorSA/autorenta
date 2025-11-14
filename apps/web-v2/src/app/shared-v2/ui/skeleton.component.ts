import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Skeleton Component V2
 * Loading placeholder with shimmer animation
 * 
 * Features:
 * - Multiple variants (text, circle, rectangle, card)
 * - Customizable width and height
 * - Shimmer animation
 * - Responsive sizing
 * - Can be composed for complex layouts
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="skeletonClasses()" [style]="skeletonStyles()">
      <ng-content />
    </div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(
        90deg,
        #F3F4F6 0%,
        #E5E7EB 50%,
        #F3F4F6 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: 8px;
    }

    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    /* Variants */
    .skeleton-text {
      height: 1rem;
      border-radius: 4px;
    }

    .skeleton-text.size-sm {
      height: 0.875rem;
    }

    .skeleton-text.size-lg {
      height: 1.25rem;
    }

    .skeleton-circle {
      border-radius: 50%;
    }

    .skeleton-rectangle {
      border-radius: 8px;
    }

    .skeleton-card {
      border-radius: 12px;
      min-height: 200px;
    }

    .skeleton-button {
      height: 44px;
      border-radius: 12px;
    }

    .skeleton-avatar {
      border-radius: 50%;
      width: 40px;
      height: 40px;
    }

    .skeleton-avatar.size-sm {
      width: 32px;
      height: 32px;
    }

    .skeleton-avatar.size-lg {
      width: 56px;
      height: 56px;
    }

    /* Pulse variant (alternative to shimmer) */
    .skeleton-pulse {
      animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* Wave variant */
    .skeleton-wave {
      overflow: hidden;
      position: relative;
    }

    .skeleton-wave::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.5),
        transparent
      );
      animation: wave 1.5s ease-in-out infinite;
    }

    @keyframes wave {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `]
})
export class SkeletonComponent {
  // Props
  variant = input<'text' | 'circle' | 'rectangle' | 'card' | 'button' | 'avatar'>('text');
  size = input<'sm' | 'md' | 'lg'>('md');
  width = input<string | null>(null);
  height = input<string | null>(null);
  animation = input<'shimmer' | 'pulse' | 'wave'>('shimmer');

  skeletonClasses(): string {
    const classes = [
      'skeleton',
      `skeleton-${this.variant()}`,
    ];

    if (this.variant() === 'text' || this.variant() === 'avatar') {
      classes.push(`size-${this.size()}`);
    }

    if (this.animation() === 'pulse') {
      classes.push('skeleton-pulse');
    } else if (this.animation() === 'wave') {
      classes.push('skeleton-wave');
    }

    return classes.join(' ');
  }

  skeletonStyles(): string {
    const styles: string[] = [];

    if (this.width()) {
      styles.push(`width: ${this.width()}`);
    }

    if (this.height()) {
      styles.push(`height: ${this.height()}`);
    }

    return styles.join('; ');
  }
}
