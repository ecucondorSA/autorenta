import { Injectable, computed, inject, signal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
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
      console.error('[AuthService] Failed to load session:', error);
    }
    this.state.set({ session: session ?? null, loading: false });
  }

  private listenToAuthChanges(): void {
    this.authSubscription = this.supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      this.state.set({ session: session ?? null, loading: false });
    });
  }

  async signUp(email: string, password: string, fullName: string): Promise<void> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          default_currency: environment.defaultCurrency,
        },
      },
    });
    if (error) {
      throw this.mapError(error);
    }
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
   * Maneja el callback de OAuth procesando los tokens del hash
   * Supabase detecta automáticamente tokens en URL fragments (#access_token=...)
   */
  async handleOAuthCallback(): Promise<{ data: Session | null; error: Error | null }> {
    try {
      // getSession() automáticamente detecta y procesa tokens en el hash de la URL
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
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

  private mapError(error: Error & { status?: number }): Error {
    if (error?.message?.toLowerCase().includes('failed to fetch')) {
      return new Error(
        'No se pudo contactar con Supabase. Verifica tu conexión y las variables NG_APP_SUPABASE_URL / NG_APP_SUPABASE_ANON_KEY.',
      );
    }
    return error;
  }
}
