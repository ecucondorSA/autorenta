import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

export interface MercadoPagoConnectionStatus {
  connected: boolean;
  collector_id?: string;
  connected_at?: string;
  account_type?: string;
  country?: string;
  token_expired?: boolean;
  needs_refresh?: boolean;
}

export interface ConnectMercadoPagoResponse {
  success: boolean;
  authorization_url?: string;
  redirect_uri?: string;
  state?: string;
  message?: string;
  error?: string;
  details?: string;
}

export interface OAuthCallbackResponse {
  success: boolean;
  message?: string;
  collector_id?: string;
  account_info?: {
    email?: string;
    name?: string;
    country?: string;
    site_id?: string;
  };
  live_mode?: boolean;
  error?: string;
  error_description?: string;
}

/**
 * Servicio para gestionar el flujo de OAuth con MercadoPago
 *
 * Permite a los dueños de autos conectar su cuenta de MercadoPago
 * para recibir pagos directos mediante split payments.
 */
@Injectable({
  providedIn: 'root',
})
export class MercadoPagoOAuthService {
  private readonly logger = inject(LoggerService);
  private supabase = injectSupabase();
  private router = inject(Router);

  /**
   * Inicia el flujo de OAuth con MercadoPago
   *
   * @param redirectUri - URL personalizada de callback (opcional)
   * @returns Promise que se resuelve cuando se redirige a MercadoPago
   */
  async connectMercadoPago(redirectUri?: string): Promise<void> {
    // Asegurar sesión fresca antes de invocar edge function
    const { error: refreshError } = await this.supabase.auth.refreshSession();
    if (refreshError) {
      this.logger.error('[OAuth] Session refresh failed', refreshError);
      throw new Error('Sesión expirada. Por favor, iniciá sesión nuevamente.');
    }

    // Usar redirect URI personalizada o default
    const callbackUri = redirectUri || window.location.origin + '/auth/mercadopago/callback';

    const { data, error } = await this.supabase.functions.invoke('mercadopago-oauth-connect', {
      body: {
        redirect_uri: callbackUri,
      },
    });

    if (error) {
      throw new Error(error.message || 'Error al conectar con MercadoPago');
    }

    const response = data as ConnectMercadoPagoResponse;

    if (!response?.success || !response.authorization_url) {
      throw new Error(response?.error || 'No se pudo generar URL de autorización');
    }

    // Redirigir a MercadoPago para autorización
    window.location.href = response.authorization_url;
  }

  /**
   * Procesa el callback de MercadoPago después de la autorización
   *
   * @param code - Código de autorización de MercadoPago
   * @param state - Token de seguridad (CSRF protection)
   * @returns Promise<boolean> - true si la conexión fue exitosa
   */
  async handleCallback(code: string, state: string): Promise<boolean> {
    this.logger.debug('[OAuth Service] handleCallback called');
    this.logger.debug('[OAuth Service] State to send:', state);
    this.logger.debug('[OAuth Service] State length:', state?.length);

    const { data, error } = await this.supabase.functions.invoke('mercadopago-oauth-callback', {
      body: { code, state },
    });

    this.logger.debug('[OAuth Service] Response:', JSON.stringify(data));
    this.logger.debug('[OAuth Service] Error:', error);

    if (error) {
      throw new Error(error.message || 'Error procesando callback');
    }

    const response = data as OAuthCallbackResponse;

    if (!response?.success) {
      throw new Error(response?.error || response?.error_description || 'Error en la autorización');
    }

    return true;
  }

  /**
   * Verifica el estado de la conexión con MercadoPago
   *
   * @returns Promise<MercadoPagoConnectionStatus>
   */
  async checkConnection(): Promise<MercadoPagoConnectionStatus> {
    try {
      const { data, error } = await this.supabase.rpc('check_mercadopago_connection');

      if (error) {
        return { connected: false };
      }

      const status = (data as MercadoPagoConnectionStatus) || { connected: false };

      this.logger.debug('[OAuth] Estado:', status.connected ? '✅ Conectado' : '❌ No conectado');

      return status;
    } catch {
      return { connected: false };
    }
  }

  /**
   * Desconecta la cuenta de MercadoPago del usuario
   *
   * @returns Promise<boolean> - true si la desconexión fue exitosa
   */
  async disconnect(): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('disconnect_mercadopago');

    if (error) {
      throw new Error(error.message || 'Error al desconectar cuenta');
    }

    const response = data as { success: boolean; error?: string; warning?: string };

    if (!response?.success) {
      throw new Error(response?.error || 'No se pudo desconectar la cuenta');
    }

    return true;
  }

  /**
   * Obtiene la información del perfil con datos de MercadoPago
   *
   * @returns Promise con los datos del perfil
   */
  async getProfile(): Promise<{
    mercadopago_connected?: boolean;
    mercadopago_collector_id?: string;
    mercadopago_connected_at?: string;
    mercadopago_account_type?: string;
    mercadopago_country?: string;
  } | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select(
          `
          mercadopago_connected,
          mercadopago_collector_id,
          mercadopago_connected_at,
          mercadopago_account_type,
          mercadopago_country
        `,
        )
        .eq('id', user.id)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Verifica si el usuario actual puede publicar autos
   * (necesita tener MercadoPago conectado para split payments)
   *
   * @returns Promise<boolean>
   */
  async canPublishCars(): Promise<boolean> {
    const status = await this.checkConnection();
    return status.connected;
  }

  /**
   * Redirige al usuario a la página de conexión de MercadoPago
   */
  navigateToConnect(): void {
    this.router.navigate(['/profile/mercadopago-connect']);
  }

  /**
   * Redirige al usuario a su perfil después de conectar
   */
  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
