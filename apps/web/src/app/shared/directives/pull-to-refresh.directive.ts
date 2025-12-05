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
import { HapticFeedbackService } from '../../core/services/haptic-feedback.service';

/**
 * PullToRefreshDirective - Native-like pull to refresh
 *
 * Adds pull-to-refresh functionality to scrollable containers.
 * Provides visual feedback with a spinner and haptic feedback.
 *
 * SECURITY FIX #3: Uses singleton pattern for styles to prevent race conditions
 * when multiple directive instances try to inject styles simultaneously.
 *
 * @example
 * ```html
 * <div appPullToRefresh (refreshTriggered)="onRefresh($event)">
 *   <div *ngFor="let item of items">...</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[appPullToRefresh]',
  standalone: true,
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  @Input() pullThreshold = 80; // px to trigger refresh
  @Input() maxPull = 120; // maximum pull distance
  @Input() pullToRefreshEnabled = true;

  @Output() refreshTriggered = new EventEmitter<{ complete: () => void }>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly haptic = inject(HapticFeedbackService);

  private cleanup: (() => void) | null = null;
  private indicator: HTMLDivElement | null = null;
  private spinner: HTMLDivElement | null = null;
  private startY = 0;
  private currentY = 0;
  private isPulling = false;
  private isRefreshing = false;
  private hapticTriggered = false;

  /**
   * SECURITY FIX #3: Static flag to track if styles have been injected.
   * Prevents race condition where multiple directive instances could
   * create duplicate style elements simultaneously.
   */
  private static stylesInjected = false;

  /**
   * Static counter for active directive instances.
   * Used to clean up styles when last instance is destroyed.
   */
  private static instanceCount = 0;

  /**
   * ID of the style element for cleanup purposes.
   */
  private static readonly STYLE_ELEMENT_ID = 'pull-refresh-styles';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.pullToRefreshEnabled) return;

    // Track instance count for cleanup
    PullToRefreshDirective.instanceCount++;

    const element = this.el.nativeElement as HTMLElement;

    // Create indicator
    this.createIndicator();

    // Inject global styles once (singleton pattern)
    this.injectGlobalStyles();

    const onTouchStart = (e: TouchEvent) => {
      // Only start if at top of scroll
      if (element.scrollTop <= 0 && !this.isRefreshing) {
        this.startY = e.touches[0].clientY;
        this.isPulling = true;
        this.hapticTriggered = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!this.isPulling || this.isRefreshing) return;

      this.currentY = e.touches[0].clientY;
      const pullDistance = Math.max(0, this.currentY - this.startY);

      // Apply resistance
      const resistedPull = this.applyResistance(pullDistance);

      if (resistedPull > 0) {
        e.preventDefault();
        this.updateIndicator(resistedPull);

        // Haptic when threshold reached
        if (resistedPull >= this.pullThreshold && !this.hapticTriggered) {
          this.haptic.medium();
          this.hapticTriggered = true;
        }
      }
    };

    const onTouchEnd = () => {
      if (!this.isPulling || this.isRefreshing) return;

      const pullDistance = this.currentY - this.startY;
      const resistedPull = this.applyResistance(pullDistance);

      if (resistedPull >= this.pullThreshold) {
        this.triggerRefresh();
      } else {
        this.resetIndicator();
      }

      this.isPulling = false;
      this.startY = 0;
      this.currentY = 0;
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
      this.destroyIndicator();
    };
  }

  ngOnDestroy(): void {
    this.cleanup?.();

    // Decrement instance count
    PullToRefreshDirective.instanceCount--;

    // Clean up global styles when last instance is destroyed
    if (PullToRefreshDirective.instanceCount <= 0) {
      this.removeGlobalStyles();
      PullToRefreshDirective.stylesInjected = false;
      PullToRefreshDirective.instanceCount = 0; // Ensure non-negative
    }
  }

  /**
   * SECURITY FIX #3: Inject global styles using singleton pattern.
   * Thread-safe: only the first call actually injects styles.
   */
  private injectGlobalStyles(): void {
    // Early exit if already injected (atomic check)
    if (PullToRefreshDirective.stylesInjected) {
      return;
    }

    // Double-check in case of race condition
    if (document.getElementById(PullToRefreshDirective.STYLE_ELEMENT_ID)) {
      PullToRefreshDirective.stylesInjected = true;
      return;
    }

    // Mark as injected BEFORE creating element to prevent race
    PullToRefreshDirective.stylesInjected = true;

    const style = document.createElement('style');
    style.id = PullToRefreshDirective.STYLE_ELEMENT_ID;
    style.textContent = `
      @keyframes pull-refresh-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .pull-refresh-spinner.spinning {
        animation: pull-refresh-spin 0.8s linear infinite;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Remove global styles from DOM.
   * Called when last directive instance is destroyed.
   */
  private removeGlobalStyles(): void {
    const styleElement = document.getElementById(PullToRefreshDirective.STYLE_ELEMENT_ID);
    if (styleElement) {
      styleElement.remove();
    }
  }

  private applyResistance(distance: number): number {
    // Logarithmic resistance for natural feel
    const resistance = 0.5;
    return Math.min(distance * resistance, this.maxPull);
  }

  private createIndicator(): void {
    this.indicator = document.createElement('div');
    this.indicator.className = 'pull-refresh-indicator';
    this.indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%) translateY(-100%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--surface-raised, white);
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      transition: transform 0.2s ease;
    `;

    this.spinner = document.createElement('div');
    this.spinner.className = 'pull-refresh-spinner';
    this.spinner.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cta-default, #4F46E5)" stroke-width="2">
        <path d="M23 4v6h-6M1 20v-6h6"/>
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
      </svg>
    `;
    this.spinner.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease;
    `;

    this.indicator.appendChild(this.spinner);

    // Insert at the element's position
    const element = this.el.nativeElement as HTMLElement;
    const rect = element.getBoundingClientRect();
    this.indicator.style.top = `${rect.top}px`;

    document.body.appendChild(this.indicator);
  }

  private destroyIndicator(): void {
    this.indicator?.remove();
    this.indicator = null;
    this.spinner = null;
  }

  private updateIndicator(pullDistance: number): void {
    if (!this.indicator || !this.spinner) return;

    // Move indicator down
    const translateY = Math.min(pullDistance - 24, this.maxPull - 24);
    this.indicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;

    // Rotate spinner based on pull progress
    const progress = pullDistance / this.pullThreshold;
    const rotation = progress * 360;
    this.spinner.style.transform = `rotate(${rotation}deg)`;

    // Change color when threshold reached
    if (pullDistance >= this.pullThreshold) {
      this.indicator.style.background = 'var(--cta-default, #4F46E5)';
      this.spinner.querySelector('svg')?.setAttribute('stroke', 'white');
    } else {
      this.indicator.style.background = 'var(--surface-raised, white)';
      this.spinner.querySelector('svg')?.setAttribute('stroke', 'var(--cta-default, #4F46E5)');
    }
  }

  private triggerRefresh(): void {
    this.isRefreshing = true;
    this.haptic.success();

    // Keep indicator visible and animate spinner
    if (this.indicator && this.spinner) {
      this.indicator.style.transform = `translateX(-50%) translateY(24px)`;
      this.indicator.style.background = 'var(--cta-default, #4F46E5)';
      this.spinner.querySelector('svg')?.setAttribute('stroke', 'white');

      // Use CSS class instead of inline animation (uses global styles)
      this.spinner.classList.add('spinning');
    }

    // Emit refresh event with complete callback
    this.refreshTriggered.emit({
      complete: () => {
        this.completeRefresh();
      },
    });
  }

  private completeRefresh(): void {
    this.isRefreshing = false;
    this.haptic.light();
    this.resetIndicator();
  }

  private resetIndicator(): void {
    if (!this.indicator || !this.spinner) return;

    this.indicator.style.transform = `translateX(-50%) translateY(-100%)`;
    this.indicator.style.background = 'var(--surface-raised, white)';
    this.spinner.classList.remove('spinning');
    this.spinner.style.transform = 'rotate(0deg)';
    this.spinner.querySelector('svg')?.setAttribute('stroke', 'var(--cta-default, #4F46E5)');
  }
}
