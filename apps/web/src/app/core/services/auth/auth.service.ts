import { Injectable, PLATFORM_ID, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';

import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { RateLimiterService } from '@core/services/infrastructure/rate-limiter.service';
import { environment } from '@environment';

import { SessionService } from './session.service';
import { OAuthService } from './oauth.service';
import { ReferralsService } from './referrals.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = injectSupabase();
  private readonly sessionService = inject(SessionService);
  private readonly oauthService = inject(OAuthService);
  private readonly referralsService = inject(ReferralsService);
  private readonly rateLimiter = inject(RateLimiterService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // ============================================================================
  // Public State (Delegated to SessionService)
  // ============================================================================
  
  readonly sessionSignal = this.sessionService.session;
  readonly session$ = this.sessionService.session;
  readonly isAuthenticated = this.sessionService.isAuthenticated;
  readonly loading = this.sessionService.loading;
  readonly userEmail = this.sessionService.userEmail;
  readonly userId = this.sessionService.userId;

  constructor() {
    // Orchestration: Apply referral code on login
    effect(() => {
      const user = this.sessionService.user();
      if (user) {
        void this.referralsService.checkAndApplyPendingReferral(user.id);
      }
    });
  }

  // ============================================================================
  // Session Management (Delegated to SessionService)
  // ============================================================================

  async ensureSession(): Promise<Session | null> {
    return this.sessionService.ensureSession();
  }

  async refreshSession(): Promise<Session | null> {
    return this.sessionService.refreshSession();
  }

  async clearStaleSession(): Promise<void> {
    return this.sessionService.clearStaleSession();
  }

  async getCurrentUser(): Promise<{ id: string; email: string } | null> {
    const session = await this.ensureSession();
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email || '',
    };
  }

  async getCachedUserId(): Promise<string | null> {
    const session = await this.ensureSession();
    return session?.user?.id ?? null;
  }

  getCachedUserIdSync(): string | null {
    return this.sessionService.user()?.id ?? null;
  }

  async getCachedUser(): Promise<{ id: string; email?: string; phone?: string } | null> {
    const session = await this.ensureSession();
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      phone: session.user.phone,
    };
  }

  // ============================================================================
  // OAuth (Delegated to OAuthService)
  // ============================================================================

  async signInWithGoogle(): Promise<void> {
    return this.oauthService.signInWithGoogle();
  }

  async signInWithTikTok(): Promise<void> {
    return this.oauthService.signInWithTikTok();
  }

  async handleTikTokCallback(code: string): Promise<{ data: Session | null; error: Error | null }> {
    return this.oauthService.handleTikTokCallback(code);
  }

  async handleOAuthCallback(): Promise<{ data: Session | null; error: Error | null }> {
    return this.oauthService.handleOAuthCallback();
  }

  // ============================================================================
  // Email / Password Auth (Kept here for now)
  // ============================================================================

  async signUp(email: string, password: string, fullName: string, phone?: string): Promise<void> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          default_currency: environment.defaultCurrency,
        },
      },
    });
    if (error) {
      throw this.mapError(error);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    // Check rate limit before attempting login
    if (!this.rateLimiter.isAllowed('login', email)) {
      this.rateLimiter.logViolation('login', email);
      throw new Error(this.rateLimiter.getErrorMessage('login', email));
    }

    const { error } = await this.supabase.auth.signInWithPassword({ email, password });

    // Record attempt
    this.rateLimiter.recordAttempt('login', email);

    if (error) {
      throw this.mapError(error);
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw this.mapError(error);
    }
    // SessionService will handle the state update via onAuthStateChange
    await this.router.navigate(['/auth/login']);
  }

  async resetPassword(email: string, redirectTo?: string): Promise<void> {
    if (!this.rateLimiter.isAllowed('passwordReset', email)) {
      this.rateLimiter.logViolation('passwordReset', email);
      throw new Error(this.rateLimiter.getErrorMessage('passwordReset', email));
    }

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    this.rateLimiter.recordAttempt('passwordReset', email);

    if (error) {
      throw this.mapError(error);
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: Error & { status?: number }): Error {
    if (error?.message?.toLowerCase().includes('failed to fetch')) {
      return new Error(
        'No se pudo contactar con Supabase. Verifica tu conexión.',
      );
    }
    return error;
  }
}