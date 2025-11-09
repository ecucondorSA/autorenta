import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseClientService } from './supabase-client.service';
import { EncryptionService } from './encryption.service';

/**
 * Estado de onboarding de Mercado Pago
 */
export interface MpOnboardingState {
  id: string;
  user_id: string;
  state: string;
  redirect_uri?: string;
  expires_at: string;
  completed: boolean;
  completed_at?: string;
  error?: string;
  created_at: string;
}

/**
 * Datos del callback de OAuth
 */
export interface MpOAuthCallback {
  code: string;
  state: string;
}

/**
 * Respuesta del token exchange
 */
export interface MpTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: string; // Este es el collector_id
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

/**
 * Estado de marketplace del usuario
 */
export interface MarketplaceStatus {
  isApproved: boolean;
  collectorId?: string;
  completedAt?: string;
  hasActiveTokens: boolean;
}

/**
 * Servicio para gestionar el onboarding de propietarios en Mercado Pago Marketplace
 *
 * Flujo:
 * 1. startOnboarding() - Genera URL OAuth y guarda state
 * 2. Usuario autoriza en Mercado Pago
 * 3. handleCallback() - Intercambia code por tokens y guarda collector_id
 * 4. Usuario puede recibir pagos split
 */
@Injectable({
  providedIn: 'root',
})
export class MarketplaceOnboardingService {
  private readonly supabase = inject(SupabaseClientService).getClient();
  private readonly encryptionService = inject(EncryptionService);

  // URLs de Mercado Pago
  private readonly MP_OAUTH_URL = 'https://auth.mercadopago.com.ar/authorization';
  private readonly MP_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';

  // Credenciales (deben estar en environment)
  private readonly CLIENT_ID = environment.mercadopagoClientId;
  private readonly CLIENT_SECRET = environment.mercadopagoClientSecret;
  private readonly REDIRECT_URI = `${environment.appUrl}/mp-callback`;

  // Scopes requeridos para marketplace
  private readonly SCOPES = 'read write offline_access';

  /**
   * Inicia el flujo OAuth para vincular cuenta MP del propietario
   *
   * @param userId ID del usuario que va a vincular su cuenta
   * @returns URL de autorización de Mercado Pago
   */
  async startOnboarding(userId: string): Promise<string> {
    // Generar state único para CSRF protection
    const state = this.generateSecureState();

    // Calcular expiración (10 minutos)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Guardar state en BD
    const { error: insertError } = await this.supabase.from('mp_onboarding_states').insert({
      user_id: userId,
      state,
      redirect_uri: this.REDIRECT_URI,
      expires_at: expiresAt,
    });

    if (insertError) {
      throw new Error('No se pudo iniciar el proceso de vinculación');
    }

    // Construir URL de autorización
    const authUrl = this.buildAuthorizationUrl(state);

    return authUrl;
  }

  /**
   * Maneja el callback de OAuth después de la autorización
   *
   * @param code Code de autorización
   * @param state State para validación CSRF
   * @returns Collector ID del vendedor
   */
  async handleCallback(code: string, state: string): Promise<string> {
    try {
      // 1. Validar y obtener state
      const stateData = await this.validateState(state);

      // 2. Intercambiar code por tokens
      const tokenResponse = await this.exchangeCodeForToken(code);

      // 3. Guardar datos en BD
      await this.saveMarketplaceCredentials(stateData.user_id, tokenResponse);

      // 4. Marcar state como completado
      await this.completeOnboardingState(state);

      return tokenResponse.user_id;
    } catch (error) {
      // Guardar error en state
      if (state) {
        await this.supabase
          .from('mp_onboarding_states')
          .update({
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('state', state);
      }

      throw error;
    }
  }

  /**
   * Obtiene el estado de marketplace del usuario
   *
   * @param userId ID del usuario
   * @returns Estado de marketplace
   */
  async getMarketplaceStatus(userId: string): Promise<MarketplaceStatus> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select(
          'mercadopago_collector_id, marketplace_approved, mp_onboarding_completed_at, mp_token_expires_at',
        )
        .eq('id', userId)
        .single();

      if (error) {
        return {
          isApproved: false,
          hasActiveTokens: false,
        };
      }

      const hasActiveTokens = data?.mp_token_expires_at
        ? new Date(data.mp_token_expires_at) > new Date()
        : false;

      return {
        isApproved: data?.marketplace_approved || false,
        collectorId: data?.mercadopago_collector_id || undefined,
        completedAt: data?.mp_onboarding_completed_at || undefined,
        hasActiveTokens,
      };
    } catch {
      return {
        isApproved: false,
        hasActiveTokens: false,
      };
    }
  }

  /**
   * Verifica si el usuario puede listar autos (tiene MP vinculado)
   * Usa la nueva RPC function que consulta mp_onboarding_states
   *
   * @param userId ID del usuario
   * @returns true si puede listar
   */
  async canListCars(userId: string): Promise<boolean> {
    try {
      // Usar la nueva RPC function del migration 004
      const { data, error } = await this.supabase.rpc('can_list_cars', {
        p_user_id: userId,
      });

      if (error) {
        return false;
      }

      return data === true;
    } catch {
      return false;
    }
  }

  /**
   * Desvincula la cuenta de Mercado Pago
   * (Requiere revocar tokens en MP)
   *
   * @param userId ID del usuario
   */
  async unlinkAccount(userId: string): Promise<void> {
    // TODO: Revocar tokens en Mercado Pago API
    // https://api.mercadopago.com/oauth/token/revoke

    // Limpiar datos locales
    const { error } = await this.supabase
      .from('users')
      .update({
        mercadopago_collector_id: null,
        marketplace_approved: false,
        mp_access_token_encrypted: null,
        mp_refresh_token_encrypted: null,
        mp_token_expires_at: null,
      })
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Obtiene el access token desencriptado de un usuario
   * Útil para hacer llamadas a la API de MercadoPago
   *
   * @param userId ID del usuario
   * @returns Access token en plaintext o null si no existe
   */
  async getDecryptedAccessToken(userId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('mp_access_token_encrypted')
        .eq('id', userId)
        .single();

      if (error || !data?.mp_access_token_encrypted) {
        return null;
      }

      // Desencriptar token
      return await this.encryptionService.decrypt(data.mp_access_token_encrypted);
    } catch (error) {
      console.error('[MarketplaceOnboarding] Error decrypting access token:', error);
      return null;
    }
  }

  /**
   * Obtiene el refresh token desencriptado de un usuario
   * Útil para renovar el access token cuando expire
   *
   * @param userId ID del usuario
   * @returns Refresh token en plaintext o null si no existe
   */
  async getDecryptedRefreshToken(userId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('mp_refresh_token_encrypted')
        .eq('id', userId)
        .single();

      if (error || !data?.mp_refresh_token_encrypted) {
        return null;
      }

      // Desencriptar token
      return await this.encryptionService.decrypt(data.mp_refresh_token_encrypted);
    } catch (error) {
      console.error('[MarketplaceOnboarding] Error decrypting refresh token:', error);
      return null;
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Genera un state seguro para OAuth
   */
  private generateSecureState(): string {
    // Generar 32 bytes random en hex
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Construye la URL de autorización de Mercado Pago
   */
  private buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      response_type: 'code',
      platform_id: 'mp',
      state: state,
      redirect_uri: this.REDIRECT_URI,
    });

    return `${this.MP_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Valida el state y obtiene los datos
   */
  private async validateState(state: string): Promise<MpOnboardingState> {
    const { data, error } = await this.supabase
      .from('mp_onboarding_states')
      .select('*')
      .eq('state', state)
      .single();

    if (error || !data) {
      throw new Error('Estado de onboarding inválido o expirado');
    }

    // Verificar expiración
    if (new Date(data.expires_at) < new Date()) {
      throw new Error('El estado de onboarding ha expirado');
    }

    // Verificar que no esté ya completado
    if (data.completed) {
      throw new Error('Este onboarding ya fue completado');
    }

    return data as MpOnboardingState;
  }

  /**
   * Intercambia el code por tokens de acceso
   */
  private async exchangeCodeForToken(code: string): Promise<MpTokenResponse> {
    const body = {
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.REDIRECT_URI,
    };

    try {
      const response = await fetch(this.MP_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al obtener tokens: ${errorData.message || response.statusText}`);
      }

      const tokenData: MpTokenResponse = await response.json();
      return tokenData;
    } catch {
      throw new Error('No se pudo completar la autorización con Mercado Pago');
    }
  }

  /**
   * Guarda las credenciales de marketplace en BD
   * Los tokens se encriptan con AES-256-GCM antes de almacenarlos
   */
  private async saveMarketplaceCredentials(
    userId: string,
    tokenResponse: MpTokenResponse,
  ): Promise<void> {
    // Calcular expiración del token
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();

    // ✅ ENCRIPTAR tokens antes de guardar
    const encryptedAccessToken = await this.encryptionService.encrypt(tokenResponse.access_token);
    const encryptedRefreshToken = await this.encryptionService.encrypt(tokenResponse.refresh_token);

    const { error } = await this.supabase
      .from('users')
      .update({
        mercadopago_collector_id: tokenResponse.user_id,
        marketplace_approved: true,
        mp_onboarding_completed_at: new Date().toISOString(),
        mp_access_token_encrypted: encryptedAccessToken,
        mp_refresh_token_encrypted: encryptedRefreshToken,
        mp_token_expires_at: expiresAt,
      })
      .eq('id', userId);

    if (error) {
      throw new Error('No se pudieron guardar las credenciales');
    }
  }

  /**
   * Marca el state como completado
   */
  private async completeOnboardingState(state: string): Promise<void> {
    const { error } = await this.supabase
      .from('mp_onboarding_states')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('state', state);

    if (error) {
      // No throw, esto no es crítico
    }
  }

  /**
   * Refresh access token (cuando expira)
   * TODO: Implementar para mantener tokens actualizados
   */
  private async refreshAccessToken(refreshToken: string): Promise<MpTokenResponse> {
    const body = {
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    const response = await fetch(this.MP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return response.json();
  }
}
