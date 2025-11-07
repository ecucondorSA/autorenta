import { Injectable, computed, signal, inject } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { AuthService } from './auth.service';

/**
 * BonusProtectorService
 *
 * Servicio para gestión del Protector de Bonus.
 *
 * PROTECTOR DE BONUS:
 * - Add-on que protege la clase del conductor de subir tras siniestros
 * - Válido por 1 año desde la compra
 * - Se puede comprar desde la wallet
 *
 * NIVELES:
 * - Nivel 1: $15 USD - Protege 1 siniestro leve
 * - Nivel 2: $25 USD - Protege 2 siniestros leves o 1 moderado
 * - Nivel 3: $40 USD - Protege 3 siniestros leves, 2 moderados o 1 grave
 *
 * FUNCIONAMIENTO:
 * - Se aplica automáticamente al registrar un siniestro
 * - Reduce o elimina el aumento de clase
 * - Se consume progresivamente según severidad del siniestro
 */

export interface BonusProtectorOption {
  protection_level: number;
  price_cents: number;
  price_usd: number;
  description: string;
  validity_days: number;
}

export interface ActiveBonusProtector {
  addon_id: string;
  protection_level: number;
  purchase_date: string;
  expires_at: string;
  days_until_expiry: number;
  price_paid_usd: number;
}

interface BonusProtectorState {
  options: BonusProtectorOption[];
  activeProtector: ActiveBonusProtector | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class BonusProtectorService {
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);

  private readonly state = signal<BonusProtectorState>({
    options: [],
    activeProtector: null,
    loading: false,
    error: null,
  });

  // Computed signals
  readonly options = computed(() => this.state().options);
  readonly activeProtector = computed(() => this.state().activeProtector);
  readonly hasActiveProtector = computed(() => !!this.state().activeProtector);
  readonly protectionLevel = computed(() => this.state().activeProtector?.protection_level ?? 0);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  // Computed helpers
  readonly isNearExpiry = computed(() => {
    const days = this.state().activeProtector?.days_until_expiry;
    return days !== null && days !== undefined && days <= 30;
  });

  readonly isExpired = computed(() => {
    const days = this.state().activeProtector?.days_until_expiry;
    return days !== null && days !== undefined && days < 0;
  });

  /**
   * Carga las opciones de compra disponibles
   */
  async loadOptions(): Promise<BonusProtectorOption[]> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const { data, error } = await this.supabase.rpc('list_bonus_protector_options');

      if (error) {
        throw new Error(`Error al cargar opciones: ${error.message}`);
      }

      const options = data || [];

      this.state.update((s) => ({
        ...s,
        options,
        loading: false,
      }));

      return options;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: errorMessage,
      }));
      console.error('[BonusProtectorService] Error:', errorMessage);
      return [];
    }
  }

  /**
   * Carga el protector activo del usuario (si existe)
   */
  async loadActiveProtector(): Promise<ActiveBonusProtector | null> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const user = await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase.rpc('get_active_bonus_protector', {
        p_user_id: user.id,
      });

      if (error) {
        throw new Error(`Error al cargar protector activo: ${error.message}`);
      }

      const activeProtector = data?.[0] || null;

      this.state.update((s) => ({
        ...s,
        activeProtector,
        loading: false,
      }));

      return activeProtector;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: errorMessage,
      }));
      console.error('[BonusProtectorService] Error:', errorMessage);
      return null;
    }
  }

  /**
   * Compra un protector de bonus
   */
  async purchaseProtector(level: number): Promise<string> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      if (level < 1 || level > 3) {
        throw new Error('Nivel inválido (debe ser 1, 2 o 3)');
      }

      const user = await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase.rpc('purchase_bonus_protector', {
        p_user_id: user.id,
        p_protection_level: level,
      });

      if (error) {
        throw new Error(`Error al comprar protector: ${error.message}`);
      }

      // Recargar protector activo
      await this.loadActiveProtector();

      this.state.update((s) => ({ ...s, loading: false }));

      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: errorMessage,
      }));
      console.error('[BonusProtectorService] Error al comprar:', errorMessage);
      throw error;
    }
  }

  /**
   * Obtiene la opción recomendada según perfil del usuario
   */
  getRecommendedLevel(driverClass: number): number {
    // Clase 0-3: Nivel 1 (raramente tiene siniestros)
    // Clase 4-6: Nivel 2 (riesgo moderado)
    // Clase 7-10: Nivel 3 (alto riesgo, necesita máxima protección)

    if (driverClass <= 3) return 1;
    if (driverClass <= 6) return 2;
    return 3;
  }

  /**
   * Calcula cuántos siniestros protege cada nivel
   */
  getProtectionCapacity(level: number): {
    leve: number;
    moderado: number;
    grave: number;
    description: string;
  } {
    switch (level) {
      case 1:
        return {
          leve: 1,
          moderado: 0,
          grave: 0,
          description: 'Protege 1 siniestro leve',
        };
      case 2:
        return {
          leve: 2,
          moderado: 1,
          grave: 0,
          description: 'Protege 2 siniestros leves o 1 moderado',
        };
      case 3:
        return {
          leve: 3,
          moderado: 2,
          grave: 1,
          description: 'Protege 3 siniestros leves, 2 moderados o 1 grave',
        };
      default:
        return {
          leve: 0,
          moderado: 0,
          grave: 0,
          description: 'Nivel inválido',
        };
    }
  }

  /**
   * Calcula el ahorro potencial del protector
   */
  calculatePotentialSavings(
    level: number,
    currentClass: number,
    baseFeeUsd: number,
    baseGuaranteeUsd: number
  ): {
    feeIncrease: number;
    guaranteeIncrease: number;
    totalSavings: number;
    isWorthIt: boolean;
  } {
    // Simular aumento de clase por siniestro
    const newClass = Math.min(currentClass + level, 10);

    // Obtener multiplicadores de ambas clases (esto es aproximado)
    // En una implementación real, deberíamos obtener los multiplicadores desde la DB
    const currentMultiplier = 1.0 + (currentClass - 5) * 0.05;
    const newMultiplier = 1.0 + (newClass - 5) * 0.05;

    const feeIncrease = baseFeeUsd * (newMultiplier - currentMultiplier);
    const guaranteeIncrease = baseGuaranteeUsd * (newMultiplier - currentMultiplier);

    // Asumiendo que el usuario hace 5 bookings al año
    const bookingsPerYear = 5;
    const totalSavings = (feeIncrease + guaranteeIncrease / 10) * bookingsPerYear;

    const protectorPrice = level === 1 ? 15 : level === 2 ? 25 : 40;
    const isWorthIt = totalSavings > protectorPrice;

    return {
      feeIncrease: Math.round(feeIncrease * 100) / 100,
      guaranteeIncrease: Math.round(guaranteeIncrease * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      isWorthIt,
    };
  }

  /**
   * Obtiene fecha de expiración formateada
   */
  getFormattedExpiry(): string {
    const protector = this.activeProtector();
    if (!protector) return 'Sin protector activo';

    const date = new Date(protector.expires_at);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Obtiene días restantes como texto
   */
  getDaysRemainingText(): string {
    const protector = this.activeProtector();
    if (!protector) return '';

    const days = protector.days_until_expiry;

    if (days < 0) return 'Expirado';
    if (days === 0) return 'Expira hoy';
    if (days === 1) return 'Expira mañana';
    if (days <= 7) return `Expira en ${days} días`;

    return `${days} días restantes`;
  }

  /**
   * Obtiene color del badge según estado
   */
  getStatusBadgeColor(): string {
    if (this.isExpired()) return 'danger';
    if (this.isNearExpiry()) return 'warning';
    if (this.hasActiveProtector()) return 'success';
    return 'secondary';
  }

  /**
   * Obtiene ícono representativo del protector
   */
  getLevelIcon(level: number): string {
    switch (level) {
      case 1:
        return '🛡️';
      case 2:
        return '🛡️🛡️';
      case 3:
        return '🛡️🛡️🛡️';
      default:
        return '❌';
    }
  }

  /**
   * Obtiene mensaje informativo sobre el protector
   */
  getInfoMessage(): string {
    if (!this.hasActiveProtector()) {
      return 'No tienes Protector de Bonus activo. Compra uno para proteger tu clase de conductor.';
    }

    if (this.isExpired()) {
      return 'Tu Protector de Bonus ha expirado. Compra uno nuevo para seguir protegido.';
    }

    if (this.isNearExpiry()) {
      return `Tu Protector de Bonus expira pronto (${this.getDaysRemainingText()}). Considera renovarlo.`;
    }

    const level = this.protectionLevel();
    const capacity = this.getProtectionCapacity(level);
    return `Estás protegido: ${capacity.description}. ${this.getDaysRemainingText()}.`;
  }

  /**
   * Simula el impacto de un siniestro con y sin protector
   */
  simulateClaimImpact(
    currentClass: number,
    claimSeverity: number
  ): {
    withoutProtector: { oldClass: number; newClass: number; increase: number };
    withProtector: { oldClass: number; newClass: number; increase: number; protected: boolean };
    savings: { classIncrease: number; feeImpact: string; guaranteeImpact: string };
  } {
    const withoutProtector = {
      oldClass: currentClass,
      newClass: Math.min(currentClass + claimSeverity, 10),
      increase: claimSeverity,
    };

    const protectionLevel = this.protectionLevel();
    let withProtector;

    if (protectionLevel >= claimSeverity) {
      // Protección completa
      withProtector = {
        oldClass: currentClass,
        newClass: currentClass,
        increase: 0,
        protected: true,
      };
    } else if (protectionLevel > 0) {
      // Protección parcial
      const reducedIncrease = claimSeverity - protectionLevel;
      withProtector = {
        oldClass: currentClass,
        newClass: Math.min(currentClass + reducedIncrease, 10),
        increase: reducedIncrease,
        protected: true,
      };
    } else {
      // Sin protección
      withProtector = {
        oldClass: currentClass,
        newClass: Math.min(currentClass + claimSeverity, 10),
        increase: claimSeverity,
        protected: false,
      };
    }

    const savings = {
      classIncrease: withoutProtector.increase - withProtector.increase,
      feeImpact: withProtector.increase === 0 ? 'Sin aumento' : `+${withProtector.increase * 5}%`,
      guaranteeImpact: withProtector.increase === 0 ? 'Sin aumento' : `+${withProtector.increase * 10}%`,
    };

    return {
      withoutProtector,
      withProtector,
      savings,
    };
  }

  /**
   * Verifica si puede comprar un protector
   */
  async canPurchase(level: number): Promise<{
    can: boolean;
    reason: string;
  }> {
    if (this.hasActiveProtector() && !this.isExpired()) {
      return {
        can: false,
        reason: 'Ya tienes un Protector de Bonus activo',
      };
    }

    // Verificar fondos en wallet (esto debería llamar a WalletService)
    // Por ahora, asumimos que se verifica en el backend
    const option = this.options().find((o) => o.protection_level === level);
    if (!option) {
      return {
        can: false,
        reason: 'Nivel de protección inválido',
      };
    }

    return {
      can: true,
      reason: `Precio: $${option.price_usd} USD`,
    };
  }
}
