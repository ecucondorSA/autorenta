import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '@core/services/auth/auth.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * DriverProfileService
 *
 * Servicio para gestión del perfil de riesgo del conductor.
 *
 * FUNCIONALIDADES:
 * - Obtener perfil de conductor (clase, score, historial)
 * - Inicializar perfil para usuarios nuevos
 * - Consultar beneficios por clase
 * - Visualizar historial de cambios de clase
 *
 * CLASES DE CONDUCTOR:
 * - Clase 0: Excelente (15% descuento fee, 25% descuento garantía)
 * - Clase 5: Base (sin ajustes)
 * - Clase 10: Riesgo máximo (20% recargo fee, 80% recargo garantía)
 */

export interface DriverProfile {
  user_id: string;
  class: number;
  driver_score: number;
  good_years: number;
  total_claims: number;
  claims_with_fault: number;
  last_claim_at: string | null;
  last_claim_with_fault: boolean | null;
  last_class_update: string;
  fee_multiplier: number;
  guarantee_multiplier: number;
  class_description: string;
  created_at: string;
  updated_at: string;
}

export interface ClassBenefits {
  class: number;
  description: string;
  fee_multiplier: number;
  guarantee_multiplier: number;
  fee_discount_pct: number;
  guarantee_discount_pct: number;
  is_discount: boolean;
}

interface DriverProfileState {
  profile: DriverProfile | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DriverProfileService {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly authService = inject(AuthService);

  constructor() {
    // ✅ FIX: Auto-load profile on service init only if user is authenticated
    // Check authentication first to avoid errors
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        this.loadProfile().catch(() => {
          // Silently handle errors - user may not have profile yet
        });
      }
    });
  }

  private readonly state = signal<DriverProfileState>({
    profile: null,
    loading: false,
    error: null,
  });

  // Computed signals
  readonly profile = computed(() => this.state().profile);
  readonly driverClass = computed(() => this.state().profile?.class ?? 5);
  readonly driverScore = computed(() => this.state().profile?.driver_score ?? 50);
  readonly feeMultiplier = computed(() => this.state().profile?.fee_multiplier ?? 1.0);
  readonly guaranteeMultiplier = computed(() => this.state().profile?.guarantee_multiplier ?? 1.0);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  // Computed benefits
  readonly hasDiscount = computed(() => (this.state().profile?.fee_multiplier ?? 1.0) < 1.0);
  readonly hasSurcharge = computed(() => (this.state().profile?.fee_multiplier ?? 1.0) > 1.0);

  readonly feeDiscountPct = computed(() => {
    const multiplier = this.state().profile?.fee_multiplier ?? 1.0;
    return Math.round((1.0 - multiplier) * 100);
  });

  readonly guaranteeDiscountPct = computed(() => {
    const multiplier = this.state().profile?.guarantee_multiplier ?? 1.0;
    return Math.round((1.0 - multiplier) * 100);
  });

  /**
   * Carga el perfil del conductor actual
   */
  async loadProfile(): Promise<DriverProfile | null> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const user = await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase.rpc('get_driver_profile', {
        p_user_id: user.id,
      });

      if (error) {
        throw new Error(`Error al cargar perfil: ${error.message}`);
      }

      const profile = data?.[0] || null;

      this.state.update((s) => ({
        ...s,
        profile,
        loading: false,
      }));

      return profile;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: errorMessage,
      }));
      console.error('[DriverProfileService] Error:', errorMessage);
      return null;
    }
  }

  /**
   * Inicializa perfil para usuario nuevo (clase 5, score 50)
   */
  async initializeProfile(): Promise<void> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const user = await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { error } = await this.supabase.rpc('initialize_driver_profile', {
        p_user_id: user.id,
      });

      if (error) {
        throw new Error(`Error al inicializar perfil: ${error.message}`);
      }

      // Recargar perfil después de inicializar
      await this.loadProfile();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: errorMessage,
      }));
      console.error('[DriverProfileService] Error al inicializar:', errorMessage);
      throw error;
    }
  }

  /**
   * Obtiene beneficios de una clase específica
   */
  async getClassBenefits(classNumber: number): Promise<ClassBenefits | null> {
    if (classNumber < 0 || classNumber > 10) {
      throw new Error('Clase inválida (debe ser 0-10)');
    }

    const { data, error } = await this.supabase.rpc('get_class_benefits', {
      p_class: classNumber,
    });

    if (error) {
      throw new Error(`Error al obtener beneficios: ${error.message}`);
    }

    return data?.[0] || null;
  }

  /**
   * Obtiene beneficios de todas las clases
   */
  async getAllClassBenefits(): Promise<ClassBenefits[]> {
    const benefits: ClassBenefits[] = [];

    for (let i = 0; i <= 10; i++) {
      const benefit = await this.getClassBenefits(i);
      if (benefit) {
        benefits.push(benefit);
      }
    }

    return benefits;
  }

  /**
   * Calcula el progreso hacia la siguiente clase mejor
   */
  getProgressToNextClass(): {
    currentClass: number;
    nextClass: number;
    canImprove: boolean;
    yearsNeeded: number;
  } {
    const currentClass = this.driverClass();
    const nextClass = Math.max(0, currentClass - 1);
    const canImprove = currentClass > 0;
    const yearsNeeded = canImprove ? 1 : 0;

    return {
      currentClass,
      nextClass,
      canImprove,
      yearsNeeded,
    };
  }

  /**
   * Obtiene descripción amigable de la clase actual
   */
  getClassDescription(): string {
    const profile = this.profile();
    if (!profile) return 'Conductor Base';

    return profile.class_description || 'Conductor Base';
  }

  /**
   * Obtiene badge de clase para UI
   */
  getClassBadge(): { label: string; color: string; icon: string } {
    const classNum = this.driverClass();

    if (classNum <= 2) {
      return {
        label: 'Excelente',
        color: 'success',
        icon: '🏆',
      };
    } else if (classNum <= 4) {
      return {
        label: 'Bueno',
        color: 'primary',
        icon: '⭐',
      };
    } else if (classNum === 5) {
      return {
        label: 'Base',
        color: 'secondary',
        icon: '➖',
      };
    } else if (classNum <= 7) {
      return {
        label: 'Riesgo',
        color: 'warning',
        icon: '⚠️',
      };
    } else {
      return {
        label: 'Alto Riesgo',
        color: 'danger',
        icon: '🔴',
      };
    }
  }

  /**
   * Verifica si el perfil ha sido inicializado
   */
  async isProfileInitialized(): Promise<boolean> {
    const user = await this.authService.getCurrentUser();
    if (!user) return false;

    const { data, error } = await this.supabase
      .from('driver_risk_profile')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    return !error && !!data;
  }

  /**
   * Inicializa perfil si no existe
   */
  async ensureProfile(): Promise<void> {
    const exists = await this.isProfileInitialized();
    if (!exists) {
      await this.initializeProfile();
    } else {
      await this.loadProfile();
    }
  }

  /**
   * Calcula el impacto de un siniestro en la clase
   */
  calculateClaimImpact(
    severity: number,
    withFault: boolean,
  ): {
    currentClass: number;
    newClass: number;
    classIncrease: number;
  } {
    const currentClass = this.driverClass();

    if (!withFault) {
      return {
        currentClass,
        newClass: currentClass,
        classIncrease: 0,
      };
    }

    const classIncrease = severity; // 1 (leve), 2 (moderado), 3 (grave)
    const newClass = Math.min(currentClass + classIncrease, 10);

    return {
      currentClass,
      newClass,
      classIncrease,
    };
  }

  /**
   * Formatea el score telemático con color
   */
  getScoreColor(): string {
    const score = this.driverScore();

    if (score >= 80) return 'success';
    if (score >= 60) return 'primary';
    if (score >= 40) return 'warning';
    return 'danger';
  }

  /**
   * Obtiene mensaje motivacional según score
   */
  getScoreMessage(): string {
    const score = this.driverScore();

    if (score >= 90) return '¡Excelente conductor! Sigue así 🎉';
    if (score >= 80) return '¡Muy buen desempeño! 👏';
    if (score >= 70) return 'Buen trabajo, pero puedes mejorar 👍';
    if (score >= 60) return 'Desempeño aceptable, hay margen de mejora 📈';
    if (score >= 40) return 'Necesitas mejorar tu conducción ⚠️';
    return 'Conduce con precaución y mejora tus hábitos 🚨';
  }

  /**
   * Update driver class based on booking event
   * Called when booking is completed or when a claim occurs
   */
  async updateClassOnEvent(params: {
    eventType: 'booking_completed' | 'claim_filed';
    userId: string;
    claimSeverity?: number;
    claimWithFault?: boolean;
  }): Promise<void> {
    try {
      if (params.eventType === 'booking_completed') {
        // Increment good_years counter on successful booking completion
        const { error } = await this.supabase.rpc('increment_driver_good_years', {
          p_user_id: params.userId,
        });

        if (error) {
          throw new Error(`Error updating driver class: ${error.message}`);
        }
      } else if (params.eventType === 'claim_filed') {
        // Update class based on claim severity
        const { error } = await this.supabase.rpc('update_driver_class_on_claim', {
          p_user_id: params.userId,
          p_severity: params.claimSeverity ?? 1,
          p_with_fault: params.claimWithFault ?? false,
        });

        if (error) {
          throw new Error(`Error updating driver class: ${error.message}`);
        }
      }

      // Reload profile after update
      await this.loadProfile();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[DriverProfileService] Error updating class:', errorMessage);
      throw error;
    }
  }
}
