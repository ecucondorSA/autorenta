import { Injectable, computed, signal, inject } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { AuthService } from '@core/services/auth/auth.service';

/**
 * ProtectionCreditService
 *
 * Servicio para gestión del Crédito de Protección (CP).
 *
 * CRÉDITO DE PROTECCIÓN (CP):
 * - Crédito no retirable otorgado a usuarios nuevos
 * - Monto inicial: $300 USD
 * - Válido por 1 año
 * - Se consume en siniestros antes que el balance retirable
 * - Renovable gratis tras 10 bookings sin siniestros
 * - Breakage: CP no usado se reconoce como ingreso al cerrar cuenta
 *
 * WATERFALL DE CONSUMO:
 * 1. Crédito de Protección (no retirable)
 * 2. Wallet Retirable
 * 3. Pago externo (tarjeta/efectivo)
 */

export interface ProtectionCreditBalance {
  balance_cents: number;
  balance_usd: number;
  issued_at: string | null;
  expires_at: string | null;
  is_expired: boolean;
  days_until_expiry: number | null;
}

export interface ProtectionCreditConsumption {
  cp_used_cents: number;
  wr_used_cents: number;
  remaining_claim_cents: number;
  transaction_id: string;
}

interface ProtectionCreditState {
  balance: ProtectionCreditBalance | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProtectionCreditService {
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);

  private readonly state = signal<ProtectionCreditState>({
    balance: null,
    loading: false,
    error: null,
  });

  // Computed signals
  readonly balance = computed(() => this.state().balance);
  readonly balanceUsd = computed(() => this.state().balance?.balance_usd ?? 0);
  readonly balanceCents = computed(() => this.state().balance?.balance_cents ?? 0);
  readonly expiresAt = computed(() => this.state().balance?.expires_at);
  readonly isExpired = computed(() => this.state().balance?.is_expired ?? false);
  readonly daysUntilExpiry = computed(() => this.state().balance?.days_until_expiry ?? null);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  // Computed helpers
  readonly hasBalance = computed(() => (this.state().balance?.balance_cents ?? 0) > 0);
  readonly isNearExpiry = computed(() => {
    const days = this.state().balance?.days_until_expiry;
    return days !== null && days !== undefined && days <= 30; // Próximo a expirar en 30 días
  });

  /**
   * Carga el balance de Crédito de Protección
   */
  async loadBalance(): Promise<ProtectionCreditBalance | null> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const user = await this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase.rpc('get_protection_credit_balance', {
        p_user_id: user.id,
      });

      if (error) {
        throw new Error(`Error al cargar balance CP: ${error.message}`);
      }

      const balance = data?.[0] || null;

      this.state.update((s) => ({
        ...s,
        balance,
        loading: false,
      }));

      return balance;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: errorMessage,
      }));
      console.error('[ProtectionCreditService] Error:', errorMessage);
      return null;
    }
  }

  /**
   * Verifica elegibilidad para renovación gratuita
   * (10+ bookings completados sin siniestros)
   */
  async checkRenewalEligibility(): Promise<{
    eligible: boolean;
    completedBookings: number;
    totalClaims: number;
    bookingsNeeded: number;
  }> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Contar bookings completados
    const { count: completedBookings } = await this.supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('renter_id', user.id)
      .eq('status', 'completed');

    // Contar siniestros
    const { count: totalClaims } = await this.supabase
      .from('booking_claims')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['approved', 'resolved']);

    const eligible = (completedBookings ?? 0) >= 10 && (totalClaims ?? 0) === 0;
    const bookingsNeeded = Math.max(0, 10 - (completedBookings ?? 0));

    return {
      eligible,
      completedBookings: completedBookings ?? 0,
      totalClaims: totalClaims ?? 0,
      bookingsNeeded,
    };
  }

  /**
   * Formatea el balance para mostrar en UI
   */
  getFormattedBalance(): string {
    const usd = this.balanceUsd();
    return `$${usd.toFixed(2)} USD`;
  }

  /**
   * Obtiene fecha de expiración formateada
   */
  getFormattedExpiry(): string {
    const expiresAt = this.expiresAt();
    if (!expiresAt) return 'Sin expiración';

    const date = new Date(expiresAt);
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
    const days = this.daysUntilExpiry();

    if (days === null) return '';
    if (days < 0) return 'Expirado';
    if (days === 0) return 'Expira hoy';
    if (days === 1) return 'Expira mañana';
    if (days <= 7) return `Expira en ${days} días`;
    if (days <= 30) return `Expira en ${days} días`;

    return `${days} días restantes`;
  }

  /**
   * Obtiene color del badge según estado
   */
  getStatusBadgeColor(): string {
    if (this.isExpired()) return 'danger';
    if (this.isNearExpiry()) return 'warning';
    if (this.hasBalance()) return 'success';
    return 'secondary';
  }

  /**
   * Obtiene el porcentaje de balance usado
   */
  getUsagePercentage(): number {
    const balance = this.balanceCents();
    const initial = 30000; // $300 USD inicial

    if (balance >= initial) return 0; // No usado o renovado
    return Math.round(((initial - balance) / initial) * 100);
  }

  /**
   * Calcula cuánto CP cubriría un siniestro
   */
  calculateCoverage(claimAmountCents: number): {
    cpWillCover: number;
    cpWillCoverPct: number;
    remainingClaim: number;
    willFullyCover: boolean;
  } {
    const balance = this.balanceCents();
    const cpWillCover = Math.min(balance, claimAmountCents);
    const cpWillCoverPct = claimAmountCents > 0 ? (cpWillCover / claimAmountCents) * 100 : 0;
    const remainingClaim = claimAmountCents - cpWillCover;
    const willFullyCover = cpWillCover >= claimAmountCents;

    return {
      cpWillCover,
      cpWillCoverPct: Math.round(cpWillCoverPct),
      remainingClaim,
      willFullyCover,
    };
  }

  /**
   * Obtiene mensaje informativo sobre el CP
   */
  getInfoMessage(): string {
    if (this.isExpired()) {
      return 'Tu Crédito de Protección ha expirado. Completa 10 bookings sin siniestros para renovarlo gratis.';
    }

    if (!this.hasBalance()) {
      return 'No tienes Crédito de Protección disponible. Completa 10 bookings sin siniestros para obtenerlo.';
    }

    if (this.isNearExpiry()) {
      return `Tu Crédito de Protección expira pronto (${this.getDaysRemainingText()}). Se renovará automáticamente si cumples los requisitos.`;
    }

    return 'Tu Crédito de Protección te protege en caso de siniestros. No es retirable pero se usa antes que tu balance.';
  }

  /**
   * Obtiene ícono representativo del estado
   */
  getStatusIcon(): string {
    if (this.isExpired()) return '❌';
    if (this.isNearExpiry()) return '⚠️';
    if (this.hasBalance()) return '✅';
    return '➖';
  }

  /**
   * Verifica si se puede usar CP para un monto
   */
  canCoverAmount(amountCents: number): boolean {
    return this.balanceCents() >= amountCents && !this.isExpired();
  }

  /**
   * Calcula el desglose de pago con waterfall
   */
  calculatePaymentBreakdown(
    totalAmountCents: number,
    walletBalanceCents: number,
  ): {
    cpUsed: number;
    wrUsed: number;
    externalPayment: number;
    breakdown: Array<{ source: string; amount: number; percentage: number }>;
  } {
    const cpAvailable = this.isExpired() ? 0 : this.balanceCents();
    let remaining = totalAmountCents;

    // 1. Usar CP primero
    const cpUsed = Math.min(cpAvailable, remaining);
    remaining -= cpUsed;

    // 2. Usar WR segundo
    const wrUsed = Math.min(walletBalanceCents, remaining);
    remaining -= wrUsed;

    // 3. Resto es pago externo
    const externalPayment = remaining;

    const breakdown = [
      {
        source: 'Crédito de Protección',
        amount: cpUsed,
        percentage: (cpUsed / totalAmountCents) * 100,
      },
      {
        source: 'Balance Retirable',
        amount: wrUsed,
        percentage: (wrUsed / totalAmountCents) * 100,
      },
      {
        source: 'Pago Externo',
        amount: externalPayment,
        percentage: (externalPayment / totalAmountCents) * 100,
      },
    ].filter((item) => item.amount > 0);

    return {
      cpUsed,
      wrUsed,
      externalPayment,
      breakdown,
    };
  }

  /**
   * Obtiene progreso hacia renovación gratuita
   */
  async getRenewalProgress(): Promise<{
    eligible: boolean;
    progress: number;
    message: string;
  }> {
    const eligibility = await this.checkRenewalEligibility();

    const progress = Math.min((eligibility.completedBookings / 10) * 100, 100);

    let message = '';
    if (eligibility.eligible) {
      message = '¡Felicitaciones! Eres elegible para renovación gratuita de CP.';
    } else if (eligibility.totalClaims > 0) {
      message = `Tienes ${eligibility.totalClaims} siniestro(s). No calificas para renovación gratuita.`;
    } else {
      message = `Completa ${eligibility.bookingsNeeded} bookings más sin siniestros para renovación gratuita.`;
    }

    return {
      eligible: eligibility.eligible,
      progress: Math.round(progress),
      message,
    };
  }
}
