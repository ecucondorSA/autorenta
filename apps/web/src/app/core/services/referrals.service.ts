import { Injectable, inject, signal, computed } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

/**
 * Referral Service
 *
 * Gestiona el sistema de referidos y códigos de invitación.
 *
 * Features:
 * - Generar código de referido único
 * - Aplicar código cuando un usuario se registra
 * - Ver estadísticas de referidos
 * - Listar recompensas ganadas
 */

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code_id: string;
  status: 'registered' | 'verified' | 'first_car' | 'first_booking' | 'reward_paid';
  registered_at: string;
  verified_at: string | null;
  first_car_at: string | null;
  first_booking_at: string | null;
  reward_paid_at: string | null;
  source: string | null;
}

export interface ReferralReward {
  id: string;
  referral_id: string;
  user_id: string;
  reward_type:
    | 'welcome_bonus'
    | 'referrer_bonus'
    | 'first_car_bonus'
    | 'milestone_bonus'
    | 'promotion';
  amount_cents: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'expired' | 'cancelled';
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  expires_at: string | null;
  notes: string | null;
}

export interface ReferralStats {
  user_id: string;
  code: string;
  total_referrals: number;
  registered_count: number;
  verified_count: number;
  first_car_count: number;
  first_booking_count: number;
  total_earned_cents: number;
  pending_cents: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReferralsService {
  private readonly supabase = injectSupabase();

  // State
  readonly myReferralCode = signal<ReferralCode | null>(null);
  readonly myStats = signal<ReferralStats | null>(null);
  readonly myReferrals = signal<Referral[]>([]);
  readonly myRewards = signal<ReferralReward[]>([]);
  readonly loading = signal(false);

  // Computed
  readonly totalEarned = computed(() => {
    const stats = this.myStats();
    return stats ? stats.total_earned_cents / 100 : 0;
  });

  readonly pendingEarnings = computed(() => {
    const stats = this.myStats();
    return stats ? stats.pending_cents / 100 : 0;
  });

  readonly shareableLink = computed(() => {
    const code = this.myReferralCode();
    if (!code) return null;
    return `${window.location.origin}/ref/${code.code}`;
  });

  /**
   * Obtener o generar código de referido del usuario actual
   */
  async getOrCreateMyReferralCode(): Promise<ReferralCode> {
    this.loading.set(true);
    try {
      // Verificar si ya tiene código
      const { data: existing, error: fetchError } = await this.supabase
        .from('referral_codes')
        .select('*')
        .eq('is_active', true)
        .single();

      if (existing && !fetchError) {
        this.myReferralCode.set(existing);
        return existing;
      }

      // Generar nuevo código
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: newCode, error: createError } = await this.supabase.rpc(
        'generate_referral_code',
        {
          p_user_id: user.id,
        },
      );

      if (createError) throw createError;

      // Fetch el código recién creado
      const { data: created, error: refetchError } = await this.supabase
        .from('referral_codes')
        .select('*')
        .eq('code', newCode)
        .single();

      if (refetchError) throw refetchError;

      this.myReferralCode.set(created);
      return created;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Aplicar código de referido (cuando un nuevo usuario se registra)
   */
  async applyReferralCode(code: string, source = 'web'): Promise<string> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: referralId, error } = await this.supabase.rpc('apply_referral_code', {
      p_referred_user_id: user.id,
      p_code: code.toUpperCase(),
      p_source: source,
    });

    if (error) throw error;

    return referralId;
  }

  /**
   * Obtener estadísticas de mis referidos
   */
  async getMyStats(): Promise<ReferralStats> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('referral_stats_by_user')
        .select('*')
        .single();

      if (error) {
        // Si no tiene estadísticas aún, retornar valores por defecto
        if (error.code === 'PGRST116') {
          const defaultStats: ReferralStats = {
            user_id: '',
            code: '',
            total_referrals: 0,
            registered_count: 0,
            verified_count: 0,
            first_car_count: 0,
            first_booking_count: 0,
            total_earned_cents: 0,
            pending_cents: 0,
          };
          this.myStats.set(defaultStats);
          return defaultStats;
        }
        throw error;
      }

      this.myStats.set(data);
      return data;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Listar mis referidos
   */
  async getMyReferrals(): Promise<Referral[]> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('referrals')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) throw error;

      this.myReferrals.set(data || []);
      return data || [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Listar mis recompensas
   */
  async getMyRewards(): Promise<ReferralReward[]> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('referral_rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.myRewards.set(data || []);
      return data || [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Validar si un código existe y es válido
   */
  async validateReferralCode(code: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('referral_codes')
      .select('id, expires_at, max_uses, current_uses')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) return false;

    // Verificar expiración
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return false;
    }

    // Verificar límite de usos
    if (data.max_uses && data.current_uses >= data.max_uses) {
      return false;
    }

    return true;
  }

  /**
   * Obtener información de un código de referido (sin exponer user_id)
   */
  async getReferralCodeInfo(code: string): Promise<{ valid: boolean; usesLeft: number | null }> {
    const { data, error } = await this.supabase
      .from('referral_codes')
      .select('expires_at, max_uses, current_uses')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { valid: false, usesLeft: null };
    }

    // Verificar expiración
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, usesLeft: null };
    }

    // Calcular usos restantes
    const usesLeft = data.max_uses ? data.max_uses - data.current_uses : null;

    // Verificar límite de usos
    if (usesLeft !== null && usesLeft <= 0) {
      return { valid: false, usesLeft: 0 };
    }

    return { valid: true, usesLeft };
  }

  /**
   * Cargar todos los datos del usuario (código, stats, referrals, rewards)
   */
  async loadAllData(): Promise<void> {
    await Promise.all([
      this.getOrCreateMyReferralCode(),
      this.getMyStats(),
      this.getMyReferrals(),
      this.getMyRewards(),
    ]);
  }
}
