import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Rate Limiting Service
 *
 * Implements client-side rate limiting for critical endpoints
 * to prevent accidental DDoS and improve system stability.
 *
 * Complements server-side rate limiting configured in:
 * - Supabase Edge Functions (webhooks, payment endpoints)
 * - Cloudflare Workers (payment webhook)
 *
 * CRITICAL: Issue #112 - Security Hardening Epic
 *
 * Rate Limits (per-user per-endpoint):
 * - Booking Creation: 5 requests/minute (prevents accidental double-submit)
 * - Car Listing: 10 requests/minute (search, list, filter)
 * - Payment Operations: 3 requests/minute (critical, prevent fraud)
 * - User Profile: 10 requests/minute (updates, reads)
 * - Wallet Operations: 5 requests/minute (transfers, withdrawals)
 */
@Injectable({
  providedIn: 'root',
})
export class RateLimiterService {
  private requestLog = new Map<string, number[]>();

  // Rate limit configuration: endpoint pattern -> (requests per minute)
  private readonly RATE_LIMITS = {
    // Booking endpoints
    'POST.*\/rest\/v1\/bookings': 5,
    'PATCH.*\/rest\/v1\/bookings': 5,
    'DELETE.*\/rest\/v1\/bookings': 5,

    // Car endpoints
    'POST.*\/rest\/v1\/cars': 10,
    'GET.*\/rest\/v1\/cars': 20,
    'PATCH.*\/rest\/v1\/cars': 10,

    // Payment endpoints
    'POST.*create-preference': 3,
    'POST.*mercadopago-oauth': 3,
    'POST.*paypal-create': 3,
    'POST.*wallet-transfer': 5,
    'POST.*request-withdrawal': 5,

    // User profile endpoints
    'PATCH.*\/rest\/v1\/profiles': 10,
    'GET.*\/rest\/v1\/profiles': 20,

    // Default: 30 requests/minute
    'default': 30,
  };

  /**
   * Check if request is within rate limit
   * @param method HTTP method
   * @param url Request URL
   * @param userId Current user ID
   * @returns true if within limit, false if rate limited
   */
  public isWithinRateLimit(method: string, url: string, userId?: string): boolean {
    if (!environment.production) {
      // Disable rate limiting in development
      return true;
    }

    const key = this.generateKey(method, url, userId);
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    // Get or create request history for this endpoint
    const requests = this.requestLog.get(key) || [];

    // Remove old requests outside the time window
    const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);

    // Get rate limit for this endpoint
    const limit = this.getRateLimit(method, url);

    // Check if limit exceeded
    if (recentRequests.length >= limit) {
      return false;
    }

    // Record this request
    recentRequests.push(now);
    this.requestLog.set(key, recentRequests);

    return true;
  }

  /**
   * Get remaining requests for an endpoint
   * @param method HTTP method
   * @param url Request URL
   * @param userId Current user ID
   * @returns Number of remaining requests in current window
   */
  public getRemainingRequests(method: string, url: string, userId?: string): number {
    const key = this.generateKey(method, url, userId);
    const now = Date.now();
    const windowMs = 60 * 1000;

    const requests = this.requestLog.get(key) || [];
    const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);
    const limit = this.getRateLimit(method, url);

    return Math.max(0, limit - recentRequests.length);
  }

  /**
   * Get reset time for rate limit (in milliseconds)
   */
  public getResetTime(method: string, url: string, userId?: string): number {
    const key = this.generateKey(method, url, userId);
    const requests = this.requestLog.get(key) || [];

    if (requests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...requests);
    const windowMs = 60 * 1000;
    const resetTime = oldestRequest + windowMs;
    const now = Date.now();

    return Math.max(0, resetTime - now);
  }

  /**
   * Clear rate limit tracking (useful for testing)
   */
  public reset(): void {
    this.requestLog.clear();
  }

  /**
   * Get rate limit for specific endpoint
   */
  private getRateLimit(method: string, url: string): number {
    const fullMethod = `${method}`;

    for (const [pattern, limit] of Object.entries(this.RATE_LIMITS)) {
      if (pattern === 'default') continue;

      const regex = new RegExp(pattern);
      if (regex.test(`${fullMethod}${url}`)) {
        return limit;
      }
    }

    return this.RATE_LIMITS['default'];
  }

  /**
   * Generate unique key for request tracking
   */
  private generateKey(method: string, url: string, userId?: string): string {
    // Extract endpoint path (remove query params and host)
    const pathname = new URL(url, 'http://localhost').pathname;

    // If user is authenticated, include user ID for per-user tracking
    // Otherwise track by IP-like identifier
    const userPart = userId || 'anonymous';

    return `${method}:${pathname}:${userPart}`;
  }
}
