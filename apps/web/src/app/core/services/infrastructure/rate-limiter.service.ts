import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * P0-015: Client-side Rate Limiter Service
 *
 * Implements rate limiting for critical operations:
 * - Login attempts: 5 per 15 minutes
 * - Password reset: 3 per hour
 * - Message sending: 10 per minute
 * - Booking requests: 20 per day
 * - Verification uploads: 10 per hour
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  messageSend: { maxAttempts: 10, windowMs: 60 * 1000 }, // 10 per minute
  bookingRequest: { maxAttempts: 20, windowMs: 24 * 60 * 60 * 1000 }, // 20 per day
  verificationUpload: { maxAttempts: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
};

@Injectable({
  providedIn: 'root',
})
export class RateLimiterService {
  private readonly logger = inject(LoggerService);
  private readonly STORAGE_PREFIX = 'ratelimit_';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Check if an action is allowed under rate limiting
   *
   * @param action - Action key (login, passwordReset, etc.)
   * @param userId - Optional user ID for user-specific limits
   * @returns True if action is allowed, false if rate limit exceeded
   */
  isAllowed(action: keyof typeof RATE_LIMITS, userId?: string): boolean {
    const config = RATE_LIMITS[action];
    if (!config) {
      this.logger.warn(`Unknown action: ${action}`, 'RateLimiterService');
      return true; // Allow if unknown action
    }

    const key = this.getStorageKey(action, userId);
    const entry = this.getEntry(key);
    const now = Date.now();

    // Check if window has expired
    if (entry.resetAt <= now) {
      // Reset counter
      this.setEntry(key, { count: 0, resetAt: now + config.windowMs });
      return true;
    }

    // Check if limit exceeded
    if (entry.count >= config.maxAttempts) {
      return false;
    }

    return true;
  }

  /**
   * Record an action attempt
   *
   * @param action - Action key
   * @param userId - Optional user ID for user-specific limits
   */
  recordAttempt(action: keyof typeof RATE_LIMITS, userId?: string): void {
    const config = RATE_LIMITS[action];
    if (!config) {
      this.logger.warn(`Unknown action: ${action}`, 'RateLimiterService');
      return;
    }

    const key = this.getStorageKey(action, userId);
    const entry = this.getEntry(key);
    const now = Date.now();

    // Reset if window expired
    if (entry.resetAt <= now) {
      this.setEntry(key, { count: 1, resetAt: now + config.windowMs });
    } else {
      // Increment counter
      this.setEntry(key, { count: entry.count + 1, resetAt: entry.resetAt });
    }
  }

  /**
   * Get time until rate limit resets (in seconds)
   *
   * @param action - Action key
   * @param userId - Optional user ID
   * @returns Seconds until reset, or 0 if not rate limited
   */
  getRetryAfterSeconds(action: keyof typeof RATE_LIMITS, userId?: string): number {
    const key = this.getStorageKey(action, userId);
    const entry = this.getEntry(key);
    const now = Date.now();

    if (entry.resetAt <= now) {
      return 0;
    }

    return Math.ceil((entry.resetAt - now) / 1000);
  }

  /**
   * Get remaining attempts for an action
   *
   * @param action - Action key
   * @param userId - Optional user ID
   * @returns Number of attempts remaining
   */
  getRemainingAttempts(action: keyof typeof RATE_LIMITS, userId?: string): number {
    const config = RATE_LIMITS[action];
    if (!config) {
      return Number.MAX_SAFE_INTEGER;
    }

    const key = this.getStorageKey(action, userId);
    const entry = this.getEntry(key);
    const now = Date.now();

    // Reset if window expired
    if (entry.resetAt <= now) {
      return config.maxAttempts;
    }

    return Math.max(0, config.maxAttempts - entry.count);
  }

  /**
   * Reset rate limit for an action (admin use)
   *
   * @param action - Action key
   * @param userId - Optional user ID
   */
  reset(action: keyof typeof RATE_LIMITS, userId?: string): void {
    if (!this.isBrowser) return;
    const key = this.getStorageKey(action, userId);
    localStorage.removeItem(key);
  }

  /**
   * Get formatted error message for rate limit
   *
   * @param action - Action key
   * @param userId - Optional user ID
   * @returns User-friendly error message
   */
  getErrorMessage(action: keyof typeof RATE_LIMITS, userId?: string): string {
    const retryAfter = this.getRetryAfterSeconds(action, userId);
    const minutes = Math.ceil(retryAfter / 60);

    const messages: Record<string, string> = {
      login: `Too many login attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      passwordReset: `Too many password reset requests. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      messageSend: `Too many messages sent. Please wait ${retryAfter} seconds before sending another message.`,
      bookingRequest: `Daily booking limit reached. Please try again tomorrow.`,
      verificationUpload: `Too many upload attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    };

    return messages[action] || `Rate limit exceeded. Please try again later.`;
  }

  /**
   * Log rate limit violation
   *
   * @param action - Action that was rate limited
   * @param userId - Optional user ID
   */
  logViolation(action: string, userId?: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId: userId || 'anonymous',
    };

    this.logger.warn('Rate limit exceeded:', 'RateLimiterService', logEntry);

    // Store in sessionStorage for audit (browser only)
    if (!this.isBrowser) return;
    try {
      const existingLogs = sessionStorage.getItem('ratelimit_violations');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(logEntry);

      // Keep only last 50 entries
      if (logs.length > 50) {
        logs.shift();
      }

      sessionStorage.setItem('ratelimit_violations', JSON.stringify(logs));
    } catch {
      // Silently fail if sessionStorage unavailable
    }
  }

  /**
   * Get storage key for rate limit entry
   */
  private getStorageKey(action: string, userId?: string): string {
    const suffix = userId ? `_${userId}` : '';
    return `${this.STORAGE_PREFIX}${action}${suffix}`;
  }

  /**
   * Get rate limit entry from storage
   */
  private getEntry(key: string): RateLimitEntry {
    if (!this.isBrowser) {
      return { count: 0, resetAt: Date.now() };
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Invalid JSON, ignore
    }

    return { count: 0, resetAt: Date.now() };
  }

  /**
   * Set rate limit entry in storage
   */
  private setEntry(key: string, entry: RateLimitEntry): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Storage full or unavailable, ignore
    }
  }
}
