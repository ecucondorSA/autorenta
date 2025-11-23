import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { getErrorMessage } from '../utils/type-guards';
import { LoggerService } from './logger.service';
import { injectSupabase } from './supabase-client.service';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly supabase = injectSupabase();
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);
  private readonly state = signal<AuthState>({ session: null, loading: true });
  private restoreSessionPromise: Promise<void> | null = null;
  private authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;

  readonly sessionSignal = computed(() => this.state().session);
  readonly session$ = computed(() => this.state().session);
  readonly isAuthenticated = computed(() => !!this.state().session);
  readonly loading = computed(() => this.state().loading);
  readonly userEmail = computed(() => this.state().session?.user?.email);

  constructor() {
    void this.ensureSession();
    this.listenToAuthChanges();
  }

  ngOnDestroy(): void {
    this.authSubscription?.data.subscription.unsubscribe();
  }

  async ensureSession(): Promise<Session | null> {
    if (!this.state().loading) {
      return this.state().session;
    }
    if (!this.restoreSessionPromise) {
      this.restoreSessionPromise = this.loadSession().finally(() => {
        this.restoreSessionPromise = null;
      });
    }
    await this.restoreSessionPromise;
    return this.state().session;
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

  private async loadSession(): Promise<void> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();
    if (error) {
      this.logger.error(
        'Failed to load session',
        'AuthService',
        error instanceof Error ? error : new Error(getErrorMessage(error)),
      );
    }
    this.state.set({ session: session ?? null, loading: false });
  }

  async refreshSession(): Promise<Session | null> {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) {
      this.logger.warn('Failed to refresh session', 'AuthService', error);
      return null;
    }
    if (data.session) {
      this.state.set({ session: data.session, loading: false });
    }
    return data.session;
  }

  private listenToAuthChanges(): void {
    this.authSubscription = this.supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        this.state.set({ session: session ?? null, loading: false });
      },
    );
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
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Inicia sesión con Google usando Supabase OAuth
   * Redirige al usuario a la página de autenticación de Google
   */
  async signInWithGoogle(): Promise<void> {
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
   * Inicia sesión con TikTok usando OAuth custom
   * Redirige al usuario a TikTok para autenticación
   */
  async signInWithTikTok(): Promise<void> {
    const TIKTOK_CLIENT_ID = environment.tiktok?.clientId;
    if (!TIKTOK_CLIENT_ID) {
      throw new Error('TikTok Client ID no configurado');
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'user.info.basic';
    const state = this.generateRandomState();

    // Guardar state en sessionStorage para validación
    sessionStorage.setItem('tiktok_oauth_state', state);

    // Construir URL de TikTok
    const tiktokAuthUrl = new URL('https://www.tiktok.com/v2/oauth/authorize/');
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
    try {
      // Validar state para seguridad (CSRF protection)
      const savedState = sessionStorage.getItem('tiktok_oauth_state');
      sessionStorage.removeItem('tiktok_oauth_state');

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

      // Si la función devolvió una sesión válida, usarla
      if (data.session) {
        this.state.set({
          session: data.session,
          loading: false,
        });

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
    // Redirect to home page after successful logout
    await this.router.navigate(['/']);
  }

  async resetPassword(email: string, redirectTo?: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
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
