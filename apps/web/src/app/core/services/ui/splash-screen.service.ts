import { Injectable, NgZone, inject, signal } from '@angular/core';

/**
 * Service to control splash screen visibility globally.
 * Uses both signals (for Angular components) and direct DOM (as fallback).
 * This ensures the splash always hides, regardless of change detection issues.
 */
@Injectable({ providedIn: 'root' })
export class SplashScreenService {
  private readonly ngZone = inject(NgZone);
  private readonly _visible = signal(true);
  private readonly _fadeOut = signal(false);

  /** Observable state for splash visibility */
  readonly visible = this._visible.asReadonly();
  readonly fadeOut = this._fadeOut.asReadonly();

  /**
   * Hide splash with fade animation
   * Uses both signal updates AND direct DOM manipulation for reliability
   */
  hide(): void {
    this.ngZone.run(() => {
      this._fadeOut.set(true);
    });

    // Direct DOM manipulation as fallback
    this.applyFadeOutToDOM();

    setTimeout(() => {
      this.ngZone.run(() => {
        this._visible.set(false);
      });
      // Direct DOM removal as fallback
      this.hideSplashFromDOM();
    }, 500);
  }

  /** Force immediate hide (no animation) */
  hideImmediate(): void {
    this.ngZone.run(() => {
      this._fadeOut.set(true);
      this._visible.set(false);
    });
    this.hideSplashFromDOM();
  }

  /**
   * Apply fade-out classes directly to DOM (fallback for OnPush issues)
   */
  private applyFadeOutToDOM(): void {
    if (typeof document === 'undefined') return;

    const splashDiv = document.querySelector('app-splash-screen .fixed.inset-0');
    if (splashDiv) {
      splashDiv.classList.add('opacity-0', 'pointer-events-none');
    }
  }

  /**
   * Hide splash screen directly from DOM (fallback for OnPush issues)
   */
  private hideSplashFromDOM(): void {
    if (typeof document === 'undefined') return;

    const splashDiv = document.querySelector('app-splash-screen .fixed.inset-0');
    if (splashDiv) {
      splashDiv.remove();
    }
  }
}
