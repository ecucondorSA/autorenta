import { Injectable, computed, inject, signal } from '@angular/core';
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
export class AuthService {
  private readonly supabase = injectSupabase();
  private readonly router = inject(Router);
  private readonly state = signal<AuthState>({ session: null, loading: true });
  private restoreSessionPromise: Promise<void> | null = null;

  readonly sessionSignal = computed(() => this.state().session);
  readonly session$ = computed(() => this.state().session);
  readonly isAuthenticated = computed(() => !!this.state().session);
  readonly loading = computed(() => this.state().loading);

  constructor() {
    void this.ensureSession();
    this.listenToAuthChanges();
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

  private async loadSession(): Promise<void> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();
    if (error) {
      console.error('loadSession error', error);
    }
    this.state.set({ session: session ?? null, loading: false });
  }

  private listenToAuthChanges(): void {
    this.supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session) => {
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
