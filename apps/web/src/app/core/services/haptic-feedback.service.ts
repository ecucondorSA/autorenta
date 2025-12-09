import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * HapticFeedbackService - Mobile-First Tactile Feedback
 *
 * Provides haptic/vibration feedback for mobile interactions.
 * Uses Capacitor Haptics on native platforms (Android/iOS) for better quality.
 * Falls back to Web Vibration API on browsers.
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
  private readonly isBrowser: boolean;
  private readonly isNative: boolean;
  private readonly isWebSupported: boolean;
  private enabled = true;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isNative = this.isBrowser && Capacitor.isNativePlatform();
    this.isWebSupported = this.isBrowser && 'vibrate' in navigator;
  }

  /**
   * Light tap feedback (10ms)
   * Use for: button presses, toggles, quick interactions
   */
  light(): void {
    if (this.isNative) {
      this.nativeImpact(ImpactStyle.Light);
    } else {
      this.vibrate(10);
    }
  }

  /**
   * Medium feedback (20ms)
   * Use for: confirmations, selections
   */
  medium(): void {
    if (this.isNative) {
      this.nativeImpact(ImpactStyle.Medium);
    } else {
      this.vibrate(20);
    }
  }

  /**
   * Heavy feedback (30ms)
   * Use for: important actions, emphasis
   */
  heavy(): void {
    if (this.isNative) {
      this.nativeImpact(ImpactStyle.Heavy);
    } else {
      this.vibrate(30);
    }
  }

  /**
   * Success feedback - double pulse pattern
   * Use for: successful operations, completions
   */
  success(): void {
    if (this.isNative) {
      this.nativeNotification(NotificationType.Success);
    } else {
      this.vibrate([10, 50, 10]);
    }
  }

  /**
   * Error feedback - triple pulse pattern
   * Use for: errors, warnings, validation failures
   */
  error(): void {
    if (this.isNative) {
      this.nativeNotification(NotificationType.Error);
    } else {
      this.vibrate([20, 30, 20, 30, 20]);
    }
  }

  /**
   * Warning feedback
   * Use for: warnings, validation issues
   */
  warning(): void {
    if (this.isNative) {
      this.nativeNotification(NotificationType.Warning);
    } else {
      this.vibrate([15, 40, 15]);
    }
  }

  /**
   * Selection feedback (15ms)
   * Use for: list selections, tab changes, toggles
   */
  selection(): void {
    if (this.isNative) {
      void Haptics.selectionStart();
      void Haptics.selectionEnd();
    } else {
      this.vibrate(15);
    }
  }

  /**
   * Custom vibration pattern (web only)
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
    return (this.isNative || this.isWebSupported) && this.enabled;
  }

  /**
   * Native impact feedback using Capacitor Haptics
   */
  private async nativeImpact(style: ImpactStyle): Promise<void> {
    if (!this.enabled) return;

    try {
      await Haptics.impact({ style });
    } catch {
      // Silently fail if haptics not available
    }
  }

  /**
   * Native notification feedback using Capacitor Haptics
   */
  private async nativeNotification(type: NotificationType): Promise<void> {
    if (!this.enabled) return;

    try {
      await Haptics.notification({ type });
    } catch {
      // Silently fail if haptics not available
    }
  }

  /**
   * Web vibration fallback
   */
  private vibrate(pattern: number | number[]): void {
    if (!this.isWebSupported || !this.enabled) {
      return;
    }

    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently fail if vibration not available
    }
  }
}
