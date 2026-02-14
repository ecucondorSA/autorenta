import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { GoogleOneTapAuth } from 'capacitor-native-google-one-tap-signin';
import { Session } from '@supabase/supabase-js';

import { environment } from '@environment';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

@Injectable({
  providedIn: 'root',
})
export class OAuthService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  
  private readonly TIKTOK_STATE_KEY = 'tiktok_oauth_state';

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
   * Google Sign-In nativo para Android/iOS
   * Usa el plugin capacitor-native-google-one-tap-signin
   */
  private async signInWithGoogleNative(): Promise<void> {
    const clientId = environment.googleOneTap?.clientId;

    if (!clientId) {
      this.logger.error('Google One Tap: clientId no configurado', 'OAuthService');
      throw new Error('Google Sign-In no configurado. Contacta al administrador.');
    }

    try {
      await GoogleOneTapAuth.initialize({ clientId });

      // Intentar auto sign-in primero, luego One Tap
      let result = await GoogleOneTapAuth.tryAutoOrOneTapSignIn();

      // Si no funcionó, mostrar el flujo con botón nativo
      if (!result.isSuccess) {
        this.logger.debug('One Tap no disponible, intentando flujo con botón', 'OAuthService');
        result = await GoogleOneTapAuth.signInWithGoogleButtonFlowForNativePlatform();
      }

      if (!result.isSuccess || !result.success?.idToken) {
        this.logger.warn('Google Sign-In falló o fue cancelado', 'OAuthService', {
          noSuccess: result.noSuccess,
        });
        throw new Error('Inicio de sesión con Google cancelado');
      }

      this.logger.debug('Google ID Token obtenido, autenticando con Supabase', 'OAuthService');

      const { error } = await this.supabase.auth.signInWithIdToken({
        provider: 'google',
        token: result.success.idToken,
      });

      if (error) {
        this.logger.error('Supabase signInWithIdToken falló', 'OAuthService', error);
        throw this.mapError(error);
      }

      this.logger.info('Google Sign-In nativo exitoso', 'OAuthService');
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelado')) {
        throw err;
      }
      this.logger.error('Error en Google Sign-In nativo', 'OAuthService', err);
      throw err instanceof Error ? err : new Error('Error al iniciar sesión con Google');
    }
  }

  /**
   * Inicia sesión con TikTok usando OAuth custom
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

    sessionStorage.setItem(this.TIKTOK_STATE_KEY, state);

    const tiktokAuthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    tiktokAuthUrl.searchParams.set('client_key', TIKTOK_CLIENT_ID);
    tiktokAuthUrl.searchParams.set('redirect_uri', redirectUri);
    tiktokAuthUrl.searchParams.set('response_type', 'code');
    tiktokAuthUrl.searchParams.set('scope', scope);
    tiktokAuthUrl.searchParams.set('state', state);

    window.location.href = tiktokAuthUrl.toString();
  }

  /**
   * Maneja el callback de TikTok OAuth
   */
  async handleTikTokCallback(code: string): Promise<{ data: Session | null; error: Error | null }> {
    if (!this.isBrowser) {
      return { data: null, error: new Error('OAuth callback solo disponible en browser') };
    }
    if (!environment.enableTikTok) {
      return { data: null, error: new Error('TikTok login está desactivado temporalmente') };
    }
    try {
      const savedState = sessionStorage.getItem(this.TIKTOK_STATE_KEY);
      sessionStorage.removeItem(this.TIKTOK_STATE_KEY);

      if (!savedState) {
        return {
          data: null,
          error: new Error('OAuth state no encontrado. Por favor intenta nuevamente.'),
        };
      }

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

      if (data.session) {
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
   * Maneja el callback de OAuth procesando los tokens del hash
   */
  async handleOAuthCallback(): Promise<{ data: Session | null; error: Error | null }> {
    if (!this.isBrowser) {
      return { data: null, error: new Error('OAuth callback solo disponible en browser') };
    }
    try {
      const hash = window.location.hash;

      if (!hash && !window.location.search.includes('code=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');

        if (errorParam) {
          return {
            data: null,
            error: new Error(`OAuth error: ${errorParam}`),
          };
        }
      }

      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        if (error.message?.includes('bad_oauth_state') || error.message?.includes('state')) {
          return {
            data: null,
            error: new Error('La sesión de autenticación expiró. Por favor intentá nuevamente.'),
          };
        }
        return { data: null, error };
      }

      return { data: data.session, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown OAuth callback error');
      return { data: null, error };
    }
  }

  private generateRandomState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
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
