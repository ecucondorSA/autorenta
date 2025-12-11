import { Injectable } from '@angular/core';
import type {
  UserBonusMalus,
  BonusMalusCalculation,
  BonusMalusDisplay,
  BonusMalusType,
} from '../models';
import { injectSupabase } from './supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class BonusMalusService {
  private readonly supabase = injectSupabase();

  /**
   * Obtiene el factor bonus-malus del usuario autenticado
   * Recalcula automáticamente si es necesario
   */
  async getUserBonusMalus(userId?: string): Promise<UserBonusMalus | null> {
    try {
      // Si no se proporciona userId, usar el usuario autenticado
      let targetUserId = userId;
      if (!targetUserId) {
        const {
          data: { user },
          error: authError,
        } = await this.supabase.auth.getUser();
        if (authError) throw authError;
        if (!user?.id) throw new Error('Usuario no autenticado');
        targetUserId = user.id;
      }

      // Obtener factor (usa get_user_bonus_malus que recalcula si es necesario)
      const { data, error } = await this.supabase
        .from('user_bonus_malus')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;

      // Si no existe, calcular por primera vez
      if (!data) {
        await this.calculateBonusMalus(targetUserId);
        return await this.getUserBonusMalus(targetUserId);
      }

      return data as UserBonusMalus;
    } catch {
      return null;
    }
  }

  /**
   * Calcula el factor bonus-malus para un usuario específico
   */
  async calculateBonusMalus(userId?: string): Promise<BonusMalusCalculation | null> {
    try {
      // Si no se proporciona userId, usar el usuario autenticado
      let targetUserId = userId;
      if (!targetUserId) {
        const {
          data: { user },
          error: authError,
        } = await this.supabase.auth.getUser();
        if (authError) throw authError;
        if (!user?.id) throw new Error('Usuario no autenticado');
        targetUserId = user.id;
      }

      const { data, error } = await this.supabase.rpc('calculate_user_bonus_malus', {
        p_user_id: targetUserId,
      });

      if (error) throw error;
      return data as BonusMalusCalculation;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el factor bonus-malus simple (sin recalcular)
   */
  async getBonusMalusFactor(userId?: string): Promise<number> {
    try {
      const bonusMalus = await this.getUserBonusMalus(userId);
      return bonusMalus?.total_factor ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Convierte el factor bonus-malus en un objeto para mostrar en UI
   */
  getBonusMalusDisplay(factor: number): BonusMalusDisplay {
    const percentage = Math.abs(factor * 100);
    let type: BonusMalusType;
    let message: string;
    let icon: string;
    let color: string;
    const tips: string[] = [];

    if (factor < -0.05) {
      // BONUS significativo
      type = 'BONUS';
      message = `¡Tienes un ${percentage.toFixed(0)}% de descuento!`;
      icon = '🎉';
      color = 'text-success-strong';
      tips.push('Mantén tu excelente reputación para seguir obteniendo descuentos.');
    } else if (factor < 0) {
      // BONUS pequeño
      type = 'BONUS';
      message = `Tienes un ${percentage.toFixed(0)}% de descuento`;
      icon = '✨';
      color = 'text-success-strong';
      tips.push('Completa más reservas y mantén un buen rating para aumentar tu descuento.');
    } else if (factor === 0) {
      // NEUTRAL
      type = 'NEUTRAL';
      message = 'Precio estándar sin ajustes';
      icon = '➖';
      color = 'text-text-secondary dark:text-text-secondary';
      tips.push('Completa reservas y obtén buenas calificaciones para recibir descuentos.');
      tips.push('Evita cancelaciones para no recibir recargos.');
    } else if (factor <= 0.05) {
      // MALUS pequeño
      type = 'MALUS';
      message = `Tienes un ${percentage.toFixed(0)}% de recargo`;
      icon = '⚠️';
      color = 'text-warning-strong';
      tips.push('Mejora tu rating completando reservas exitosas.');
      tips.push('Evita cancelaciones para reducir el recargo.');
    } else {
      // MALUS significativo
      type = 'MALUS';
      message = `Tienes un ${percentage.toFixed(0)}% de recargo`;
      icon = '⛔';
      color = 'text-error-text';
      tips.push('Tu historial necesita mejorar para reducir el recargo.');
      tips.push('Completa reservas sin incidentes y obtén mejores calificaciones.');
      tips.push('Verifica tu identidad para reducir el recargo.');
    }

    return {
      type,
      percentage,
      message,
      icon,
      color,
      tips,
    };
  }

  /**
   * Verifica si un usuario necesita recalcular su factor
   */
  async needsRecalculation(userId?: string): Promise<boolean> {
    try {
      const bonusMalus = await this.getUserBonusMalus(userId);
      if (!bonusMalus) return true;

      const nextRecalc = new Date(bonusMalus.next_recalculation_at);
      return nextRecalc < new Date();
    } catch {
      return false;
    }
  }

  /**
   * Obtiene recomendaciones personalizadas para mejorar el factor
   */
  async getImprovementTips(userId?: string): Promise<string[]> {
    try {
      const bonusMalus = await this.getUserBonusMalus(userId);
      if (!bonusMalus) return [];

      const tips: string[] = [];
      const metrics = bonusMalus.metrics;

      // Analizar rating
      if (metrics.average_rating < 4.0 && metrics.average_rating > 0) {
        tips.push(
          '📊 Mejora tu rating: Actualmente tienes ' +
            metrics.average_rating.toFixed(1) +
            '/5.0. Enfócate en la comunicación y puntualidad.',
        );
      }

      // Analizar cancelaciones
      if (metrics.cancellation_rate > 0.1) {
        tips.push(
          '🚫 Reduce cancelaciones: Tu tasa actual es ' +
            (metrics.cancellation_rate * 100).toFixed(0) +
            '%. Evita cancelar reservas confirmadas.',
        );
      }

      // Analizar experiencia
      if (metrics.completed_rentals < 10) {
        tips.push(
          '🚗 Gana experiencia: Completa ' +
            (10 - metrics.completed_rentals) +
            ' reservas más para obtener mejores descuentos.',
        );
      }

      // Analizar verificación
      if (!metrics.is_verified) {
        tips.push(
          '✅ Verifica tu identidad: Los usuarios verificados reciben hasta 3% de descuento adicional.',
        );
      }

      // Si el usuario ya está excelente
      if (
        metrics.average_rating >= 4.8 &&
        metrics.cancellation_rate < 0.05 &&
        metrics.is_verified &&
        metrics.completed_rentals >= 20
      ) {
        tips.push(
          '🏆 ¡Excelente! Tienes el máximo descuento posible. Mantén este nivel de servicio.',
        );
      }

      return tips;
    } catch {
      return [];
    }
  }

  /**
   * Calcula el impacto monetario del factor bonus-malus en una reserva
   */
  calculateMonetaryImpact(
    basePrice: number,
    factor: number,
  ): {
    adjustedPrice: number;
    difference: number;
    percentageChange: number;
  } {
    const adjustedPrice = basePrice * (1 + factor);
    const difference = adjustedPrice - basePrice;
    const percentageChange = factor * 100;

    return {
      adjustedPrice: Math.round(adjustedPrice * 100) / 100,
      difference: Math.round(difference * 100) / 100,
      percentageChange: Math.round(percentageChange * 10) / 10,
    };
  }

  /**
   * Obtiene estadísticas agregadas del sistema bonus-malus (para admin)
   */
  async getBonusMalusStats(): Promise<{
    totalUsers: number;
    usersWithBonus: number;
    usersWithMalus: number;
    usersNeutral: number;
    averageFactor: number;
  } | null> {
    try {
      const { data, error } = await this.supabase.from('user_bonus_malus').select('total_factor');

      if (error) throw error;

      const totalUsers = data.length;
      const usersWithBonus = data.filter((u) => u.total_factor < 0).length;
      const usersWithMalus = data.filter((u) => u.total_factor > 0).length;
      const usersNeutral = data.filter((u) => u.total_factor === 0).length;
      const averageFactor = data.reduce((sum, u) => sum + u.total_factor, 0) / totalUsers;

      return {
        totalUsers,
        usersWithBonus,
        usersWithMalus,
        usersNeutral,
        averageFactor,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fuerza el recálculo de todos los usuarios que lo necesiten (admin)
   */
  async recalculateAllBonusMalus(): Promise<{ count: number; success: boolean }> {
    try {
      const { data, error } = await this.supabase.rpc('recalculate_all_bonus_malus');

      if (error) throw error;

      return {
        count: data as number,
        success: true,
      };
    } catch {
      return {
        count: 0,
        success: false,
      };
    }
  }

  // ============================================================================
  // RPC INTEGRATIONS - Backend Functions
  // ============================================================================

  /**
   * Aplica el factor bonus-malus al depósito de seguridad
   * Retorna el depósito ajustado según el historial del usuario
   */
  async applyBonusMalusToDeposit(
    baseDepositCents: number,
    userId?: string,
  ): Promise<{
    adjustedDepositCents: number;
    factor: number;
    savings: number;
  }> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        targetUserId = user?.id;
      }

      const { data, error } = await this.supabase.rpc('apply_bonus_malus_to_deposit', {
        p_user_id: targetUserId,
        p_base_deposit_cents: baseDepositCents,
      });

      if (error) throw error;

      return {
        adjustedDepositCents: data?.adjusted_deposit_cents ?? baseDepositCents,
        factor: data?.factor ?? 0,
        savings: baseDepositCents - (data?.adjusted_deposit_cents ?? baseDepositCents),
      };
    } catch {
      // Fallback: return base deposit without adjustment
      return {
        adjustedDepositCents: baseDepositCents,
        factor: 0,
        savings: 0,
      };
    }
  }

  /**
   * Obtiene el score de riesgo completo del usuario
   * Incluye desglose de bonificaciones y penalizaciones
   */
  async getUserRiskScore(userId?: string): Promise<{
    totalScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    bonuses: Array<{ type: string; value: number; description: string }>;
    maluses: Array<{ type: string; value: number; description: string }>;
    lastCalculated: string | null;
  } | null> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        targetUserId = user?.id;
      }

      const { data, error } = await this.supabase.rpc('get_user_risk_score', {
        p_user_id: targetUserId,
      });

      if (error) throw error;

      // Determine risk level based on score
      const score = data?.total_score ?? 0;
      let riskLevel: 'low' | 'medium' | 'high' = 'medium';
      if (score <= -0.1) riskLevel = 'low';
      else if (score >= 0.1) riskLevel = 'high';

      return {
        totalScore: score,
        riskLevel,
        bonuses: data?.bonuses ?? [],
        maluses: data?.maluses ?? [],
        lastCalculated: data?.last_calculated ?? null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el nivel de renter del usuario
   * Niveles: basic, verified, premium
   */
  async getRenterLevel(userId?: string): Promise<{
    level: 'basic' | 'verified' | 'premium';
    requirements: {
      emailVerified: boolean;
      phoneVerified: boolean;
      dniVerified: boolean;
      licenseVerified: boolean;
      selfieVerified: boolean;
      minRentals: number;
      currentRentals: number;
      minRating: number;
      currentRating: number;
      noLostDisputes: boolean;
    };
    nextLevel: 'verified' | 'premium' | null;
    missingRequirements: string[];
  } | null> {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        targetUserId = user?.id;
      }

      const { data, error } = await this.supabase.rpc('get_renter_level', {
        p_user_id: targetUserId,
      });

      if (error) throw error;

      return {
        level: data?.level ?? 'basic',
        requirements: data?.requirements ?? {
          emailVerified: false,
          phoneVerified: false,
          dniVerified: false,
          licenseVerified: false,
          selfieVerified: false,
          minRentals: 5,
          currentRentals: 0,
          minRating: 4.5,
          currentRating: 0,
          noLostDisputes: true,
        },
        nextLevel: data?.next_level ?? null,
        missingRequirements: data?.missing_requirements ?? [],
      };
    } catch {
      return null;
    }
  }
}
