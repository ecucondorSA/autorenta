import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { RateLimiterService } from '@core/services/infrastructure/rate-limiter.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { getErrorMessage } from '@core/utils/type-guards';
import { environment } from '@environment';
import { Capacitor } from '@capacitor/core';
import { GoogleOneTapAuth } from 'capacitor-native-google-one-tap-signin';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly TIKTOK_STATE_KEY = 'tiktok_oauth_state';

  constructor(
    private readonly router: Router,
    private readonly logger: LoggerService,
    private readonly rateLimiter: RateLimiterService,
  ) {
    // SSR-safe: Only initialize auth in browser
    if (this.isBrowser) {
      void this.ensureSession();
      this.listenToAuthChanges();
    }
  }

  /**
   * Supabase client (SSR-safe)
   * - Browser: real client
   * - SSR: stub client that returns empty results
   */
  private readonly state = signal<AuthState>({ session: null, loading: true });
  private restoreSessionPromise: Promise<Session | null> | null = null;
  private authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;

  // P0.2 FIX: Track if session has been resolved to avoid redundant calls
  private sessionResolved = false;

  // P0.3 FIX: Timestamp when session was last resolved to prevent race conditions
  private sessionResolvedAt = 0;
  // Grace period to keep promise alive for concurrent navigations (ms)
  private readonly SESSION_GRACE_PERIOD = 5000;

  readonly sessionSignal = computed(() => this.state().session);
  readonly session$ = computed(() => this.state().session);
  readonly isAuthenticated = computed(() => !!this.state().session);
  readonly loading = computed(() => this.state().loading);
  readonly userEmail = computed(() => this.state().session?.user?.email);
  readonly userId = computed(() => this.state().session?.user?.id ?? null);

  ngOnDestroy(): void {
    this.authSubscription?.data.subscription.unsubscribe();
  }

  // 🚀 PERF: Throttle ensureSession logging to avoid console spam
  private ensureSessionCallCount = 0;
  private lastEnsureSessionLog = 0;

  /**
   * P0.2 FIX: Optimized ensureSession with proper deduplication
   * P0.3 FIX: Prevents race conditions during rapid navigation
   * - Uses sessionResolved flag to avoid redundant checks
   * - Reuses single promise for concurrent callers
   * - Keeps promise alive during grace period for concurrent navigations
   * - Logs only once per second to reduce console noise
   */
  async ensureSession(): Promise<Session | null> {
    this.ensureSessionCallCount++;
    const now = Date.now();

    // 🚀 FAST PATH: Session resolved recently, return cached result immediately
    // This prevents race conditions when navigating rapidly between pages
    if (this.sessionResolved && !this.state().loading) {
      const timeSinceResolved = now - this.sessionResolvedAt;
      if (timeSinceResolved < this.SESSION_GRACE_PERIOD) {
        return this.state().session;
      }
    }

    // 🚀 PERF: Only log once per second max to avoid console spam
    if (now - this.lastEnsureSessionLog > 1000) {
      this.logger.debug('ensureSession called', 'AuthService', {
        loading: this.state().loading,
        hasSession: !!this.state().session,
        callCount: this.ensureSessionCallCount,
        resolved: this.sessionResolved,
      });
      this.lastEnsureSessionLog = now;
      this.ensureSessionCallCount = 0;
    }

    // Fast path: session already loaded (backup check)
    if (!this.state().loading) {
      this.sessionResolved = true;
      this.sessionResolvedAt = now;
      return this.state().session;
    }

    // Dedupe concurrent calls - reuse existing promise
    // P0.3 FIX: Don't clear promise in finally(), keep it during grace period
    if (!this.restoreSessionPromise) {
      this.restoreSessionPromise = this.loadSession()
        .then(() => {
          this.sessionResolved = true;
          this.sessionResolvedAt = Date.now();
          return this.state().session;
        })
        .catch((error) => {
          this.logger.error('ensureSession failed', 'AuthService', error);
          this.sessionResolved = true; // Mark as resolved even on error to prevent infinite retries
          this.sessionResolvedAt = Date.now();
          return null;
        });

      // P0.3 FIX: Clear promise AFTER grace period, not immediately
      // This allows concurrent navigations to share the same promise
      setTimeout(() => {
        this.restoreSessionPromise = null;
      }, this.SESSION_GRACE_PERIOD);
    }

    return this.restoreSessionPromise;
  }

  /**
   * ✅ FIX P0.1: Obtener usuario autenticado con email
   */
  async getCurrentUser(): Promise<{ id: string; email: string } | null> {
    const session = await this.ensureSession();
    if (!session?.user) return null;

    return {
      id: session.user.id,
      email: session.user.email || '',
    };
  }

  // ============================================================================
  // 🚀 PERF: Cached User Methods
  // These methods use the cached session instead of making API calls.
  // Services should use these instead of supabase.auth.getUser() directly.
  // ============================================================================

  /**
   * 🚀 PERF: Get cached user ID without API call
   * Returns null if not authenticated or session not yet loaded.
   * Use this instead of: (await supabase.auth.getUser()).data.user?.id
   *
   * @example
   * // Before (makes API call each time):
   * const userId = (await this.supabase.auth.getUser()).data.user?.id;
   *
   * // After (uses cached session):
   * const userId = await this.authService.getCachedUserId();
   */
  async getCachedUserId(): Promise<string | null> {
    const session = await this.ensureSession();
    return session?.user?.id ?? null;
  }

  /**
   * 🚀 PERF: Synchronous cached user ID (returns null if session not loaded yet)
   * Use for non-critical checks where you don't want to wait for session load.
   */
  getCachedUserIdSync(): string | null {
    return this.state().session?.user?.id ?? null;
  }

  /**
   * 🚀 PERF: Get full user object from cached session
   * Returns the Supabase User object without making an API call.
   */
  async getCachedUser(): Promise<{ id: string; email?: string; phone?: string } | null> {
    const session = await this.ensureSession();
    if (!session?.user) return null;

    return {
      id: session.user.id,
      email: session.user.email,
      phone: session.user.phone,
    };
  }

  /**
   * P0.4 FIX: Wait for Supabase SDK initialization before checking session
   * On full page reload, the SDK needs time to recover session from localStorage.
   * We wait for onAuthStateChange to fire with INITIAL_SESSION before giving up.
   */
  private async loadSession(): Promise<void> {
    this.logger.debug('loadSession: starting...', 'AuthService');

    // First attempt - SDK might be ready
    const {
      data: { session: initialSession },
      error: initialError,
    } = await this.supabase.auth.getSession();

    // If we got a session immediately, we're done
    if (initialSession) {
      this.logger.debug('loadSession: immediate session found', 'AuthService');
      this.state.set({ session: initialSession, loading: false });
      return;
    }

    // P0.4 FIX: No session on first try - wait for SDK initialization
    // The SDK fires INITIAL_SESSION event when it finishes recovering from localStorage
    this.logger.debug('loadSession: no immediate session, waiting for SDK init...', 'AuthService');

    const SDK_INIT_TIMEOUT = 3000; // 3 seconds max wait for SDK

    try {
      const session = await new Promise<Session | null>((resolve) => {
        let resolved = false;

        // Timeout fallback - don't wait forever
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            this.logger.debug('loadSession: SDK init timeout, no session', 'AuthService');
            resolve(null);
          }
        }, SDK_INIT_TIMEOUT);

        // Listen for the INITIAL_SESSION event from SDK
        const { data: { subscription } } = this.supabase.auth.onAuthStateChange((event, eventSession) => {
          this.logger.debug('loadSession: auth event during init', 'AuthService', { event, hasSession: !!eventSession });

          // INITIAL_SESSION fires when SDK finishes loading from storage
          // SIGNED_IN fires if user was previously authenticated
          if (!resolved && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
            resolved = true;
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve(eventSession);
          }
        });
      });

      if (session) {
        this.logger.debug('loadSession: session recovered after SDK init', 'AuthService');
        this.state.set({ session, loading: false });
        return;
      }
    } catch (err) {
      this.logger.warn('loadSession: error waiting for SDK init', 'AuthService', err);
    }

    // No session found after waiting
    this.logger.debug('loadSession: no session after SDK init', 'AuthService', {
      initialError: initialError?.message,
    });

    if (initialError) {
      this.logger.error(
        'Failed to load session',
        'AuthService',
        initialError instanceof Error ? initialError : new Error(getErrorMessage(initialError)),
      );
      // ✅ FIX: Clear stale session data if there's an auth error
      // This prevents "Tu sesión expiró" errors on public pages
      await this.clearStaleSession();
    }
    this.state.set({ session: null, loading: false });
  }

  /**
   * ✅ FIX: Clear stale session from localStorage
   * Called when session is invalid/expired to prevent auth errors on public pages
   */
  private async clearStaleSession(): Promise<void> {
    this.logger.debug('clearStaleSession: clearing invalid session', 'AuthService');
    try {
      // Sign out locally without making API call (session is already invalid)
      await this.supabase.auth.signOut({ scope: 'local' });
      this.state.set({ session: null, loading: false });
    } catch (err) {
      this.logger.warn('clearStaleSession: failed to clear', 'AuthService', err);
    }
  }

  async refreshSession(): Promise<Session | null> {
    this.logger.debug('refreshSession called', 'AuthService');
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) {
      this.logger.warn('Failed to refresh session', 'AuthService', error);
      this.logger.debug('refreshSession failed', 'AuthService', { message: error.message });
      // ✅ FIX: Clear stale session if refresh fails (token expired)
      await this.clearStaleSession();

      // ✅ P0.5 FIX: If refresh fails on a protected route, redirect to login
      if (this.isOnProtectedRoute()) {
        this.logger.warn('Refresh failed on protected route, redirecting to login', 'AuthService');
        void this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: this.router.url },
        });
      }
      return null;
    }
    if (data.session) {
      this.logger.debug('refreshSession success', 'AuthService');
      this.state.set({ session: data.session, loading: false });
    }
    return data.session;
  }

  /**
   * Route prefixes that require authentication.
   * If session expires on any of these, redirect to login.
   * Source of truth: app.routes.ts — every route WITH canMatch: [AuthGuard]
   */
  private readonly PROTECTED_ROUTE_PREFIXES = [
    '/profile',
    '/bookings',
    '/reviews',
    '/admin',
    '/referrals',
    '/protections',
    '/verification',
    '/contact-verification',
    '/finanzas',
    '/wallet',
    '/dashboard',
    '/scout',
    '/calendar-demo',
    '/payouts',
    '/messages',
    '/notifications',
    '/cars/publish',
    '/cars/my',
    '/cars/bulk-blocking',
  ];

  /** Dynamic protected route patterns (e.g. /cars/:id/availability) */
  private readonly PROTECTED_ROUTE_PATTERNS = [
    /^\/cars\/[^/]+\/availability/,
    /^\/cars\/[^/]+\/documents/,
  ];

  /**
   * Check if the current URL is a protected route that requires auth.
   */
  private isOnProtectedRoute(): boolean {
    const currentUrl = this.router.url || '/';
    // Check static protected prefixes
    if (this.PROTECTED_ROUTE_PREFIXES.some((prefix) => currentUrl.startsWith(prefix))) {
      return true;
    }
    // Check dynamic protected patterns
    return this.PROTECTED_ROUTE_PATTERNS.some((pattern) => pattern.test(currentUrl));
  }

  private listenToAuthChanges(): void {
    this.authSubscription = this.supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        this.logger.debug('onAuthStateChange', 'AuthService', {
          event,
          hasSession: !!session,
        });

        // ✅ FIX: Handle token refresh failures gracefully
        // When SIGNED_OUT is triggered unexpectedly (e.g., token refresh failed),
        // clear the session without showing errors on public pages
        if (event === 'SIGNED_OUT' && !session) {
          this.logger.debug('Session ended (possibly expired)', 'AuthService');
          // P0.2 FIX: Reset resolved flag on sign out
          this.sessionResolved = false;
          // P0.3 FIX: Clear promise to force fresh load on next navigation
          this.restoreSessionPromise = null;
          this.sessionResolvedAt = 0;

          // ✅ P0.5 FIX: Redirect to login if user is on a protected route
          // This prevents the broken-page state when session expires mid-navigation.
          // Supabase SDK calls use fetch() directly (not Angular HttpClient),
          // so the auth-refresh interceptor never fires for them.
          if (this.isOnProtectedRoute()) {
            this.logger.warn(
              'Session expired on protected route, redirecting to login',
              'AuthService',
              { url: this.router.url },
            );
            void this.router.navigate(['/auth/login'], {
              queryParams: { returnUrl: this.router.url },
            });
          }
        }

        // ✅ Apply pending referral code after successful sign-in
        if (event === 'SIGNED_IN' && session?.user) {
          void this.applyPendingReferralCode(session.user.id);
          // P0.2 FIX: Mark as resolved on sign in
          this.sessionResolved = true;
          // P0.3 FIX: Update timestamp on sign in
          this.sessionResolvedAt = Date.now();
        }

        // P0.3 FIX: Update resolved state on TOKEN_REFRESHED
        if (event === 'TOKEN_REFRESHED' && session) {
          this.sessionResolved = true;
          this.sessionResolvedAt = Date.now();
        }

        this.state.set({ session: session ?? null, loading: false });
      },
    );
  }

  /**
   * Apply referral code stored in sessionStorage after registration
   * This is called automatically when a user signs in for the first time
   */
  private async applyPendingReferralCode(userId: string): Promise<void> {
    const REFERRAL_CODE_KEY = 'referral_code';

    try {
      const code = sessionStorage.getItem(REFERRAL_CODE_KEY);
      if (!code) return;

      this.logger.debug('Applying pending referral code', 'AuthService', { code });

      // Clear immediately to prevent duplicate applications
      sessionStorage.removeItem(REFERRAL_CODE_KEY);

      // Apply the referral code via RPC
      const { error } = await this.supabase.rpc('apply_referral_code', {
        p_referred_user_id: userId,
        p_code: code.toUpperCase(),
        p_source: 'web_auto',
      });

      if (error) {
        // Common expected errors - don't log as errors
        if (error.message?.includes('already referred')) {
          this.logger.debug('User already referred, skipping', 'AuthService');
          return;
        }
        if (error.message?.includes('Invalid or expired')) {
          this.logger.debug('Referral code invalid or expired', 'AuthService', { code });
          return;
        }
        this.logger.warn('Failed to apply referral code', 'AuthService', error);
        return;
      }

      this.logger.info('Referral code applied successfully', 'AuthService', { code });
    } catch (err) {
      this.logger.warn('Error applying referral code', 'AuthService', err);
    }
  }

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

    // Note: CompleteRegistration tracking moved to register component to avoid circular dependency
  }

  async signIn(email: string, password: string): Promise<void> {
    // P0-015: Check rate limit before attempting login
    if (!this.rateLimiter.isAllowed('login', email)) {
      this.rateLimiter.logViolation('login', email);
      throw new Error(this.rateLimiter.getErrorMessage('login', email));
    }

    const { error } = await this.supabase.auth.signInWithPassword({ email, password });

    // Record attempt regardless of success/failure
    this.rateLimiter.recordAttempt('login', email);

    if (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Inicia sesión con Google
   * - En plataformas nativas (Android/iOS): Usa Google One Tap nativo
   * - En web: Usa OAuth redirect tradicional
   */
  async signInWithGoogle(): Promise<void> {
    if (!this.isBrowser) {
      throw new Error('OAuth solo disponible en browser');
    }

    // En plataformas nativas, usar Google One Tap nativo
    if (Capacitor.isNativePlatform()) {
      return this.signInWithGoogleNative();
    }

    // Flujo web OAuth tradicional
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw this.mapError(error);
    }
  }

  /**
   * 🆕 Google Sign-In nativo para Android/iOS
   * Usa el plugin capacitor-native-google-one-tap-signin para mostrar
   * la UI nativa de Google dentro de la app (sin abrir Chrome)
   */
  private async signInWithGoogleNative(): Promise<void> {
    const clientId = environment.googleOneTap?.clientId;

    if (!clientId) {
      this.logger.error('Google One Tap: clientId no configurado', 'AuthService');
      throw new Error('Google Sign-In no configurado. Contacta al administrador.');
    }

    try {
      // Inicializar el plugin con el Web Client ID
      await GoogleOneTapAuth.initialize({ clientId });

      // Intentar auto sign-in primero, luego One Tap
      let result = await GoogleOneTapAuth.tryAutoOrOneTapSignIn();

      // Si no funcionó, mostrar el flujo con botón nativo
      if (!result.isSuccess) {
        this.logger.debug('One Tap no disponible, intentando flujo con botón', 'AuthService');
        result = await GoogleOneTapAuth.signInWithGoogleButtonFlowForNativePlatform();
      }

      if (!result.isSuccess || !result.success?.idToken) {
        this.logger.warn('Google Sign-In falló o fue cancelado', 'AuthService', { noSuccess: result.noSuccess });
        throw new Error('Inicio de sesión con Google cancelado');
      }

      this.logger.debug('Google ID Token obtenido, autenticando con Supabase', 'AuthService');

      // Autenticar con Supabase usando el ID Token de Google
      const { error } = await this.supabase.auth.signInWithIdToken({
        provider: 'google',
        token: result.success.idToken,
      });

      if (error) {
        this.logger.error('Supabase signInWithIdToken falló', 'AuthService', error);
        throw this.mapError(error);
      }

      this.logger.info('Google Sign-In nativo exitoso', 'AuthService');
    } catch (err) {
      // Cancelación del usuario - no logear como error
      if (err instanceof Error && err.message.includes('cancelado')) {
        throw err;
      }
      this.logger.error('Error en Google Sign-In nativo', 'AuthService', err);
      throw err instanceof Error ? err : new Error('Error al iniciar sesión con Google');
    }
  }

  /**
   * Inicia sesión con TikTok usando OAuth custom
   * Redirige al usuario a TikTok para autenticación
   */
  async signInWithTikTok(): Promise<void> {
    if (!this.isBrowser) {
      throw new Error('OAuth solo disponible en browser');
    }
    if (!environment.enableTikTok) {
      throw new Error('TikTok login está desactivado temporalmente');
    }
    const TIKTOK_CLIENT_ID = environment.tiktok?.clientId;
    if (!TIKTOK_CLIENT_ID) {
      throw new Error('TikTok Client ID no configurado');
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'user.info.basic';
    const state = this.generateRandomState();

    // Guardar state en sessionStorage para validación
    sessionStorage.setItem(this.TIKTOK_STATE_KEY, state);

    // Construir URL de TikTok (v2 API - https://developers.tiktok.com/doc/oauth-user-access-token-management)
    const tiktokAuthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    tiktokAuthUrl.searchParams.set('client_key', TIKTOK_CLIENT_ID);
    tiktokAuthUrl.searchParams.set('redirect_uri', redirectUri);
    tiktokAuthUrl.searchParams.set('response_type', 'code');
    tiktokAuthUrl.searchParams.set('scope', scope);
    tiktokAuthUrl.searchParams.set('state', state);

    // Redirigir a TikTok
    window.location.href = tiktokAuthUrl.toString();
  }

  /**
   * Maneja el callback de TikTok OAuth
   * Intercambia el código por sesión de usuario
   */
  async handleTikTokCallback(code: string): Promise<{ data: Session | null; error: Error | null }> {
    if (!this.isBrowser) {
      return { data: null, error: new Error('OAuth callback solo disponible en browser') };
    }
    if (!environment.enableTikTok) {
      return { data: null, error: new Error('TikTok login está desactivado temporalmente') };
    }
    try {
      // Validar state para seguridad (CSRF protection)
      const savedState = sessionStorage.getItem(this.TIKTOK_STATE_KEY);
      sessionStorage.removeItem(this.TIKTOK_STATE_KEY);

      if (!savedState) {
        return {
          data: null,
          error: new Error('OAuth state no encontrado. Por favor intenta nuevamente.'),
        };
      }

      // Llamar Edge Function para intercambiar código
      const response = await fetch(
        `${environment.supabaseUrl}/functions/v1/tiktok-oauth-callback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${environment.supabaseAnonKey}`,
            apikey: environment.supabaseAnonKey,
          },
          body: JSON.stringify({ code }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          data: null,
          error: new Error(data.error || 'Error al procesar autenticación de TikTok'),
        };
      }

      // Si la función devolvió una sesión válida, establecerla en Supabase SDK
      if (data.session) {
        // CRÍTICO: Usar setSession para que Supabase SDK maneje tokens y RLS funcione
        const { error: setSessionError } = await this.supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (setSessionError) {
          return {
            data: null,
            error: new Error(`Error estableciendo sesión: ${setSessionError.message}`),
          };
        }

        // El onAuthStateChange actualizará automáticamente el state signal
        return {
          data: data.session,
          error: null,
        };
      }

      return {
        data: null,
        error: new Error('No se recibió sesión válida'),
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Error procesando callback de TikTok'),
      };
    }
  }

  /**
   * Genera un estado aleatorio para protección CSRF
   */
  private generateRandomState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Maneja el callback de OAuth procesando los tokens del hash
   * Supabase detecta automáticamente tokens en URL fragments (#access_token=...)
   */
  async handleOAuthCallback(): Promise<{ data: Session | null; error: Error | null }> {
    if (!this.isBrowser) {
      return { data: null, error: new Error('OAuth callback solo disponible en browser') };
    }
    try {
      // Verificar si hay un hash en la URL (tokens de OAuth)
      const hash = window.location.hash;

      if (!hash && !window.location.search.includes('code=')) {
        // No hay tokens ni código - puede ser un error
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');

        if (errorParam) {
          return {
            data: null,
            error: new Error(`OAuth error: ${errorParam}`),
          };
        }
      }

      // getSession() automáticamente detecta y procesa tokens en el hash de la URL
      // También puede procesar tokens de query params si Supabase los maneja
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        // Mejorar mensajes de error comunes
        if (error.message?.includes('bad_oauth_state') || error.message?.includes('state')) {
          return {
            data: null,
            error: new Error('La sesión de autenticación expiró. Por favor intentá nuevamente.'),
          };
        }
        return { data: null, error };
      }

      if (data.session) {
        // Actualizar el state con la nueva sesión
        this.state.set({ session: data.session, loading: false });
      }

      return { data: data.session, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown OAuth callback error');
      return { data: null, error };
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw this.mapError(error);
    }
    // Redirect to login page after successful logout
    await this.router.navigate(['/auth/login']);
  }

  async resetPassword(email: string, redirectTo?: string): Promise<void> {
    // P0-015: Check rate limit for password reset
    if (!this.rateLimiter.isAllowed('passwordReset', email)) {
      this.rateLimiter.logViolation('passwordReset', email);
      throw new Error(this.rateLimiter.getErrorMessage('passwordReset', email));
    }

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // Record attempt
    this.rateLimiter.recordAttempt('passwordReset', email);

    if (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Update user password
   */
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
        'No se pudo contactar con Supabase. Verifica tu conexión y las variables NG_APP_SUPABASE_URL / NG_APP_SUPABASE_ANON_KEY.',
      );
    }
    return error;
  }
}
