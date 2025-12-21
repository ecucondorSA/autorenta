import {
  Directive,
  ElementRef,
  OnInit,
  OnDestroy,
  inject,
  Input,
  Output,
  EventEmitter,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { GestureService } from '@core/services/ui/gesture.service';
import { HapticFeedbackService } from '@core/services/ui/haptic-feedback.service';

/**
 * SwipeBackDirective - iOS-style swipe back navigation
 *
 * Enables edge swipe gesture to navigate back in browser history.
 * Provides visual feedback during the gesture with a preview overlay.
 *
 * @example
 * ```html
 * <div appSwipeBack>Content with swipe back enabled</div>
 * <div appSwipeBack [swipeBackEnabled]="canGoBack">Conditional swipe</div>
 * <div appSwipeBack (swipeBackTriggered)="onSwipeBack()">Custom handler</div>
 * ```
 */
@Directive({
  selector: '[appSwipeBack]',
  standalone: true,
})
export class SwipeBackDirective implements OnInit, OnDestroy {
  @Input() swipeBackEnabled = true;
  @Input() edgeWidth = 30; // px from left edge to trigger
  @Input() threshold = 100; // px to complete gesture

  @Output() swipeBackTriggered = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly router = inject(Router);
  private readonly gesture = inject(GestureService);
  private readonly haptic = inject(HapticFeedbackService);

  private cleanup: (() => void) | null = null;
  private overlay: HTMLDivElement | null = null;
  private indicator: HTMLDivElement | null = null;
  private startX = 0;
  private currentX = 0;
  private isEdgeSwipe = false;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.swipeBackEnabled) return;

    const element = this.el.nativeElement as HTMLElement;

    // Create visual feedback elements
    this.createOverlay();

    // Setup touch handlers
    const onTouchStart = (e: TouchEvent) => {
      const touchX = e.touches[0].clientX;

      // Only trigger from left edge
      if (touchX <= this.edgeWidth) {
        this.isEdgeSwipe = true;
        this.startX = touchX;
        this.currentX = touchX;
        this.haptic.light();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!this.isEdgeSwipe) return;

      this.currentX = e.touches[0].clientX;
      const progress = Math.min((this.currentX - this.startX) / this.threshold, 1);

      this.updateOverlay(progress);

      // Prevent page scroll during swipe
      if (progress > 0.1) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!this.isEdgeSwipe) return;

      const distance = this.currentX - this.startX;
      const completed = distance >= this.threshold;

      if (completed) {
        this.haptic.medium();
        this.completeNavigation();
      } else {
        this.cancelGesture();
      }

      this.isEdgeSwipe = false;
      this.startX = 0;
      this.currentX = 0;
    };

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);

    this.cleanup = () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
      this.destroyOverlay();
    };
  }

  ngOnDestroy(): void {
    this.cleanup?.();
  }

  private createOverlay(): void {
    // Overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'swipe-back-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 100%;
      background: linear-gradient(90deg, rgba(0,0,0,0.1) 0%, transparent 30%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 50;
    `;

    // Arrow indicator
    this.indicator = document.createElement('div');
    this.indicator.className = 'swipe-back-indicator';
    this.indicator.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    `;
    this.indicator.style.cssText = `
      position: fixed;
      left: 8px;
      top: 50%;
      transform: translateY(-50%) translateX(-50px);
      width: 40px;
      height: 40px;
      background: var(--cta-default, #4F46E5);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s ease, opacity 0.2s ease;
      opacity: 0;
      z-index: 10000;
    `;

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.indicator);
  }

  private destroyOverlay(): void {
    this.overlay?.remove();
    this.indicator?.remove();
    this.overlay = null;
    this.indicator = null;
  }

  private updateOverlay(progress: number): void {
    if (!this.overlay || !this.indicator) return;

    // Show overlay
    this.overlay.style.opacity = String(progress * 0.5);

    // Animate indicator
    const translateX = -50 + progress * 70; // -50px to 20px
    this.indicator.style.transform = `translateY(-50%) translateX(${translateX}px)`;
    this.indicator.style.opacity = String(Math.min(progress * 2, 1));

    // Scale indicator when threshold reached
    if (progress >= 1) {
      this.indicator.style.transform = `translateY(-50%) translateX(20px) scale(1.1)`;
    }
  }

  private completeNavigation(): void {
    // Animate out
    if (this.indicator) {
      this.indicator.style.transform = `translateY(-50%) translateX(100px)`;
      this.indicator.style.opacity = '0';
    }

    setTimeout(() => {
      this.swipeBackTriggered.emit();

      // Default behavior: navigate back
      if (window.history.length > 1) {
        window.history.back();
      } else {
        this.router.navigate(['/']);
      }

      this.resetOverlay();
    }, 150);
  }

  private cancelGesture(): void {
    this.resetOverlay();
  }

  private resetOverlay(): void {
    if (this.overlay) {
      this.overlay.style.opacity = '0';
    }
    if (this.indicator) {
      this.indicator.style.transform = `translateY(-50%) translateX(-50px)`;
      this.indicator.style.opacity = '0';
    }
  }
}
