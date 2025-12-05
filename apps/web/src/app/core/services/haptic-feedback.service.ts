import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * HapticFeedbackService - Mobile-First Tactile Feedback
 *
 * Provides haptic/vibration feedback for mobile interactions.
 * Uses the Web Vibration API (navigator.vibrate).
 * Falls back gracefully on unsupported browsers/platforms.
 *
 * Feedback Types:
 * - light: Quick tap (10ms) - button presses, toggles
 * - medium: Standard feedback (20ms) - confirmations, selections
 * - heavy: Strong feedback (30ms) - errors, important actions
 * - success: Double pulse (10-50-10ms) - successful operations
 * - error: Triple pulse (20-30-20-30-20ms) - errors, warnings
 * - selection: Light tap (15ms) - list selections, tab changes
 *
 * @example
 * ```typescript
 * private haptic = inject(HapticFeedbackService);
 *
 * onButtonClick() {
 *   this.haptic.light();
 * }
 *
 * onSuccess() {
 *   this.haptic.success();
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class HapticFeedbackService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isSupported: boolean;
  private enabled = true;

  constructor() {
    this.isSupported = isPlatformBrowser(this.platformId) && 'vibrate' in navigator;
  }

  /**
   * Light tap feedback (10ms)
   * Use for: button presses, toggles, quick interactions
   */
  light(): void {
    this.vibrate(10);
  }

  /**
   * Medium feedback (20ms)
   * Use for: confirmations, selections
   */
  medium(): void {
    this.vibrate(20);
  }

  /**
   * Heavy feedback (30ms)
   * Use for: important actions, emphasis
   */
  heavy(): void {
    this.vibrate(30);
  }

  /**
   * Success feedback - double pulse pattern
   * Use for: successful operations, completions
   */
  success(): void {
    this.vibrate([10, 50, 10]);
  }

  /**
   * Error feedback - triple pulse pattern
   * Use for: errors, warnings, validation failures
   */
  error(): void {
    this.vibrate([20, 30, 20, 30, 20]);
  }

  /**
   * Selection feedback (15ms)
   * Use for: list selections, tab changes, toggles
   */
  selection(): void {
    this.vibrate(15);
  }

  /**
   * Custom vibration pattern
   * @param pattern - Duration in ms or array of durations [vibrate, pause, vibrate...]
   */
  custom(pattern: number | number[]): void {
    this.vibrate(pattern);
  }

  /**
   * Enable/disable haptic feedback globally
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if haptic feedback is supported and enabled
   */
  isAvailable(): boolean {
    return this.isSupported && this.enabled;
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.isSupported || !this.enabled) {
      return;
    }

    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently fail if vibration not available
    }
  }
}
