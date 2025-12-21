import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

export interface MarketplaceConfig {
  marketplaceId: string;
  applicationId: string;
  platformFeePercentage: number;
  isConfigured: boolean;
}

export interface MarketplaceValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: MarketplaceConfig;
}

export interface MarketplaceStatus {
  status: 'not_started' | 'pending' | 'completed' | 'error';
  canReceivePayments: boolean;
  onboardingUrl?: string;
  collectorId?: string;
  error?: string;
}

type WindowWithEnv = Window & {
  env?: Record<string, string | undefined>;
};

/**
 * Servicio para gestionar la configuración del Marketplace de MercadoPago
 * y validar que todo esté correcto para split payments
 */
@Injectable({
  providedIn: 'root',
})
export class MarketplaceService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = injectSupabase();
  }

  /**
   * Valida que la configuración del marketplace esté completa
   */
  async validateMarketplaceConfig(): Promise<MarketplaceValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Obtener configuración de variables de entorno
    const marketplaceId = this.getEnvVar('MERCADOPAGO_MARKETPLACE_ID');
    const applicationId = this.getEnvVar('MERCADOPAGO_APPLICATION_ID');
    const platformFeeStr = this.getEnvVar('MERCADOPAGO_PLATFORM_FEE_PERCENTAGE') || '10';
    const platformFeePercentage = parseFloat(platformFeeStr);

    // Validar variables críticas
    if (!marketplaceId) {
      errors.push('MERCADOPAGO_MARKETPLACE_ID no está configurado');
    }

    if (!applicationId) {
      errors.push('MERCADOPAGO_APPLICATION_ID no está configurado');
    }

    // Validar porcentaje de comisión
    if (isNaN(platformFeePercentage) || platformFeePercentage <= 0 || platformFeePercentage > 100) {
      warnings.push(`Porcentaje de comisión inválido: ${platformFeeStr}. Usando 10% por defecto.`);
    }

    const config: MarketplaceConfig = {
      marketplaceId: marketplaceId || '',
      applicationId: applicationId || '',
      platformFeePercentage: isNaN(platformFeePercentage) ? 10 : platformFeePercentage,
      isConfigured: errors.length === 0,
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config,
    };
  }

  /**
   * Verifica que un usuario haya completado el onboarding de MercadoPago
   */
  async isUserOnboardingComplete(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('mp_onboarding_completed, mercadopago_collector_id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.mp_onboarding_completed === true && !!data.mercadopago_collector_id;
  }

  /**
   * Obtiene el collector ID de un usuario
   */
  async getUserCollectorId(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('mercadopago_collector_id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.mercadopago_collector_id;
  }

  /**
   * Calcula los montos del split payment
   */
  calculateSplitAmounts(
    totalAmount: number,
    feePercentage?: number,
  ): {
    total: number;
    platformFee: number;
    ownerAmount: number;
  } {
    const fee = feePercentage ?? 10;
    const platformFee = Math.round(totalAmount * (fee / 100));
    const ownerAmount = totalAmount - platformFee;

    return {
      total: totalAmount,
      platformFee,
      ownerAmount,
    };
  }

  /**
   * Obtiene la configuración del marketplace desde variables de entorno
   */
  async getMarketplaceConfig(): Promise<MarketplaceConfig> {
    const validation = await this.validateMarketplaceConfig();

    if (!validation.isValid) {
      throw new Error(`Marketplace no configurado: ${validation.errors.join(', ')}`);
    }

    return validation.config!;
  }

  /**
   * Helper para obtener variables de entorno
   * En Angular, estas deben estar en window.env (inyectadas en build time)
   */
  private getEnvVar(key: string): string | undefined {
    // Obtener de window.env (generado por scripts/generate-env.js)
    if (typeof window !== 'undefined') {
      const win = window as WindowWithEnv;
      return win.env?.[key];
    }

    return undefined;
  }

  /**
   * Verifica que un auto tenga el collector ID del dueño
   */
  async validateCarHasCollectorId(carId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('owner_mp_collector_id, owner_id')
      .eq('id', carId)
      .single();

    if (error || !data) {
      return false;
    }

    // Si no tiene collector ID, verificar que el owner tenga onboarding completo
    if (!data.owner_mp_collector_id) {
      const hasOnboarding = await this.isUserOnboardingComplete(data.owner_id);
      if (!hasOnboarding) {
        return false;
      }

      // Actualizar el car con el collector ID
      const collectorId = await this.getUserCollectorId(data.owner_id);
      if (collectorId) {
        await this.updateCarCollectorId(carId, collectorId);
        return true;
      }

      return false;
    }

    return true;
  }

  /**
   * Actualiza el collector ID de un auto
   */
  private async updateCarCollectorId(carId: string, collectorId: string): Promise<void> {
    const { error } = await this.supabase
      .from('cars')
      .update({ owner_mp_collector_id: collectorId })
      .eq('id', carId);

    if (error) {
      throw error;
    }
  }

  /**
   * Get onboarding status for current user
   */
  async getOnboardingStatus(): Promise<MarketplaceStatus> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          status: 'not_started',
          canReceivePayments: false,
          error: 'Usuario no autenticado',
        };
      }

      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('mp_onboarding_completed, mercadopago_collector_id, mp_onboarding_url')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return {
          status: 'not_started',
          canReceivePayments: false,
        };
      }

      if (data.mp_onboarding_completed && data.mercadopago_collector_id) {
        return {
          status: 'completed',
          canReceivePayments: true,
          collectorId: data.mercadopago_collector_id,
        };
      }

      if (data.mp_onboarding_url) {
        return {
          status: 'pending',
          canReceivePayments: false,
          onboardingUrl: data.mp_onboarding_url,
        };
      }

      return {
        status: 'not_started',
        canReceivePayments: false,
      };
    } catch (error) {
      return {
        status: 'error',
        canReceivePayments: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Initiate MercadoPago onboarding for current user
   */
  async initiateOnboarding(): Promise<string | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Call Edge Function to initiate onboarding
      const { data, error } = await this.supabase.functions.invoke(
        'mercadopago-initiate-onboarding',
        {
          body: { user_id: user.id },
        },
      );

      if (error) {
        throw error;
      }

      return data?.onboarding_url || null;
    } catch (error) {
      console.error('Error initiating onboarding:', error);
      return null;
    }
  }
}
