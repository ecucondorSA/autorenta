import { Injectable, Injector, OnDestroy, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { isProtectedUrl } from '@core/config/protected-routes';
import { getErrorMessage } from '@core/utils/type-guards';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService implements OnDestroy {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly injector = inject(Injector); // For lazy injection if needed

  // State
  private readonly state = signal<AuthState>({ session: null, loading: true });
  
  // Public Signals
  readonly session = computed(() => this.state().session);
  readonly loading = computed(() => this.state().loading);
  readonly isAuthenticated = computed(() => !!this.state().session);
  readonly user = computed(() => this.state().session?.user ?? null);
  readonly userId = computed(() => this.state().session?.user?.id ?? null);
  readonly userEmail = computed(() => this.state().session?.user?.email ?? null);

  // Deduplication & Race Condition Prevention
  private restoreSessionPromise: Promise<Session | null> | null = null;
  private sessionResolved = false;
  private sessionResolvedAt = 0;
  private readonly SESSION_GRACE_PERIOD = 5000;
  private authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;
  
  // Logging throttle
  private ensureSessionCallCount = 0;
  private lastEnsureSessionLog = 0;

  constructor() {
    if (this.isBrowser) {
      // Start listening immediately
      this.listenToAuthChanges();
      // Initial load
      void this.ensureSession();
    } else {
      // SSR: No session
      this.state.set({ session: null, loading: false });
    }
  }

  ngOnDestroy(): void {
    this.authSubscription?.data.subscription.unsubscribe();
  }

  /**
   * Optimized ensureSession with proper deduplication
   * Prevents race conditions during rapid navigation
   */
  async ensureSession(): Promise<Session | null> {
    this.ensureSessionCallCount++;
    const now = Date.now();

    // FAST PATH: Session resolved recently
    if (this.sessionResolved && !this.state().loading) {
      const timeSinceResolved = now - this.sessionResolvedAt;
      if (timeSinceResolved < this.SESSION_GRACE_PERIOD) {
        return this.state().session;
      }
    }

    // Throttle logs
    if (now - this.lastEnsureSessionLog > 1000) {
      this.logger.debug('ensureSession called', 'SessionService', {
        loading: this.state().loading,
        hasSession: !!this.state().session,
        callCount: this.ensureSessionCallCount,
        resolved: this.sessionResolved,
      });
      this.lastEnsureSessionLog = now;
      this.ensureSessionCallCount = 0;
    }

    // Fast path: session already loaded
    if (!this.state().loading) {
      this.sessionResolved = true;
      this.sessionResolvedAt = now;
      return this.state().session;
    }

    // Dedupe concurrent calls
    if (!this.restoreSessionPromise) {
      this.restoreSessionPromise = this.loadSession()
        .then(() => {
          this.sessionResolved = true;
          this.sessionResolvedAt = Date.now();
          return this.state().session;
        })
        .catch((error) => {
          this.logger.error('ensureSession failed', 'SessionService', error);
          this.sessionResolved = true;
          this.sessionResolvedAt = Date.now();
          return null;
        });

      setTimeout(() => {
        this.restoreSessionPromise = null;
      }, this.SESSION_GRACE_PERIOD);
    }

    return this.restoreSessionPromise;
  }

  async refreshSession(): Promise<Session | null> {
    this.logger.debug('refreshSession called', 'SessionService');
    const { data, error } = await this.supabase.auth.refreshSession();
    
    if (error || !data.session) {
      if (error) {
        this.logger.warn('Failed to refresh session', 'SessionService', error);
      } else {
        this.logger.warn('refreshSession returned no session', 'SessionService');
      }
      
      await this.clearStaleSession();

      if (this.isOnProtectedRoute()) {
        this.logger.warn('Refresh failed on protected route, redirecting', 'SessionService');
        void this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: this.router.url },
        });
      }
      return null;
    }

    this.logger.debug('refreshSession success', 'SessionService');
    this.state.set({ session: data.session, loading: false });
    return data.session;
  }

  async clearStaleSession(): Promise<void> {
    this.logger.debug('clearStaleSession: clearing invalid session', 'SessionService');
    this.sessionResolved = false;
    this.sessionResolvedAt = 0;
    this.restoreSessionPromise = null;
    try {
      await this.supabase.auth.signOut({ scope: 'local' });
      this.state.set({ session: null, loading: false });
    } catch (err) {
      this.logger.warn('clearStaleSession: failed to clear', 'SessionService', err);
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async loadSession(): Promise<void> {
    this.logger.debug('loadSession: starting...', 'SessionService');

    // First attempt - SDK might be ready
    const {
      data: { session: initialSession },
      error: initialError,
    } = await this.supabase.auth.getSession();

    if (initialSession) {
      this.logger.debug('loadSession: immediate session found', 'SessionService');
      this.state.set({ session: initialSession, loading: false });
      return;
    }

    // Wait for SDK initialization
    this.logger.debug('loadSession: waiting for SDK init...', 'SessionService');
    const SDK_INIT_TIMEOUT = 3000;

    try {
      const session = await new Promise<Session | null>((resolve) => {
        let resolved = false;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            this.logger.debug('loadSession: SDK init timeout', 'SessionService');
            resolve(null);
          }
        }, SDK_INIT_TIMEOUT);

        const { data: { subscription } } = this.supabase.auth.onAuthStateChange((event, eventSession) => {
          if (!resolved && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
            resolved = true;
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve(eventSession);
          }
        });
      });

      if (session) {
        this.logger.debug('loadSession: session recovered', 'SessionService');
        this.state.set({ session, loading: false });
        return;
      }
    } catch (err) {
      this.logger.warn('loadSession: error waiting for SDK', 'SessionService', err);
    }

    if (initialError) {
      this.logger.error('Failed to load session', 'SessionService', initialError);
      await this.clearStaleSession();
    }
    
    this.state.set({ session: null, loading: false });
  }

  private listenToAuthChanges(): void {
    this.authSubscription = this.supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        this.logger.debug('onAuthStateChange', 'SessionService', { event, hasSession: !!session });

        if (event === 'SIGNED_OUT' && !session) {
          this.handleSignOut();
        }

        if (event === 'SIGNED_IN' && session) {
          this.sessionResolved = true;
          this.sessionResolvedAt = Date.now();
        }

        if (event === 'TOKEN_REFRESHED' && session) {
          this.sessionResolved = true;
          this.sessionResolvedAt = Date.now();
        }

        this.state.set({ session: session ?? null, loading: false });
      },
    );
  }

  private handleSignOut(): void {
    this.logger.debug('Session ended', 'SessionService');
    this.sessionResolved = false;
    this.restoreSessionPromise = null;
    this.sessionResolvedAt = 0;

    if (this.isOnProtectedRoute()) {
      this.logger.warn('Session expired on protected route', 'SessionService');
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
    }
  }

  private isOnProtectedRoute(): boolean {
    return isProtectedUrl(this.router.url);
  }
}
