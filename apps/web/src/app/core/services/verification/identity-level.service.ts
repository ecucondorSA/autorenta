import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * User Identity Level Data
 * Represents progressive verification levels (1-3)
 */
export interface UserIdentityLevel {
  user_id: string;
  current_level: 1 | 2 | 3;

  // Level 1: Email + Phone
  email_verified_at: string | null;
  phone_verified_at: string | null;
  phone_number: string | null;

  // Level 2: Documents (DNI + Driver License)
  document_type: string | null;
  document_number: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  document_ai_score: number | null;
  driver_license_url: string | null;
  driver_license_number: string | null;
  driver_license_category: string | null;
  driver_license_expiry: string | null;
  driver_license_verified_at: string | null;
  driver_license_ai_score: number | null;

  // Level 3: Biometric (Selfie)
  selfie_url: string | null;
  selfie_verified_at: string | null;
  face_match_score: number | null;
  liveness_score: number | null;

  // Extracted data from documents
  extracted_full_name: string | null;
  extracted_birth_date: string | null;
  extracted_gender: string | null;

  // Manual review
  manual_review_required: boolean;
  manual_reviewed_by: string | null;
  manual_review_decision: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Verification Progress Response
 */
export interface VerificationProgress {
  success: boolean;
  user_id: string;
  current_level: 1 | 2 | 3;
  progress_percentage: number;
  requirements: {
    level_1: {
      email_verified: boolean;
      phone_verified: boolean;
      completed: boolean;
    };
    level_2: {
      document_verified: boolean;
      driver_license_verified: boolean;
      completed: boolean;
      ai_score: number | null;
      driver_license_score: number | null;
    };
    level_3: {
      selfie_verified: boolean;
      completed: boolean;
      face_match_score: number | null;
    };
  };
  missing_requirements: Array<{
    requirement: string;
    label: string;
    level: number;
    requires_level_2?: boolean;
  }>;
  can_access_level_2: boolean;
  can_access_level_3: boolean;
}

/**
 * Level Access Check Response
 */
export interface LevelAccessCheck {
  allowed: boolean;
  current_level: number;
  required_level: number;
  message?: string;
  upgrade_url?: string;
  error?: string;
}

/**
 * Service for managing user identity verification levels
 *
 * Handles progressive verification:
 * - Level 1: Email + Phone verification
 * - Level 2: Document verification (DNI + Driver License)
 * - Level 3: Biometric verification (Selfie with face matching)
 */
@Injectable({
  providedIn: 'root',
})
export class IdentityLevelService implements OnDestroy {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly logger = inject(LoggerService).createChildLogger('IdentityLevelService');

  // Reactive state
  readonly identityLevel = signal<UserIdentityLevel | null>(null);
  readonly verificationProgress = signal<VerificationProgress | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Realtime subscription
  private realtimeChannel?: RealtimeChannel;
  private currentUserId: string | null = null;

  // Computed values
  readonly currentLevel = computed(() => this.identityLevel()?.current_level ?? 1);
  readonly progressPercentage = computed(
    () => this.verificationProgress()?.progress_percentage ?? 0,
  );
  readonly isLevel1Complete = computed(() => this.currentLevel() >= 1);
  readonly isLevel2Complete = computed(() => this.currentLevel() >= 2);
  readonly isLevel3Complete = computed(() => this.currentLevel() >= 3);
  readonly canAccessLevel2 = computed(
    () => this.verificationProgress()?.can_access_level_2 ?? false,
  );
  readonly canAccessLevel3 = computed(
    () => this.verificationProgress()?.can_access_level_3 ?? false,
  );

  /**
   * Load current user's identity level data
   */
  async loadIdentityLevel(): Promise<UserIdentityLevel | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase
        .from('user_identity_levels')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no record exists, return null (will be created on first verification)
        if (error.code === 'PGRST116') {
          this.identityLevel.set(null);
          return null;
        }
        throw error;
      }

      this.identityLevel.set(data as UserIdentityLevel);
      return data as UserIdentityLevel;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos cargar el nivel de verificación';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get detailed verification progress (0-100%)
   */
  async getVerificationProgress(): Promise<VerificationProgress> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Refresh session to prevent stale JWT tokens (especially after OAuth login)
      await this.supabase.auth.refreshSession();

      const { data, error } = await this.supabase.rpc('get_verification_progress');

      if (error) {
        throw error;
      }

      // The RPC returns {success: false, error: '...'} when auth fails
      // instead of a Supabase error - validate the response
      const result = data as Record<string, unknown>;
      if (result && result['success'] === false) {
        throw new Error((result['error'] as string) || 'Error al obtener progreso');
      }

      const progress = data as VerificationProgress;
      this.verificationProgress.set(progress);
      return progress;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos obtener el progreso de verificación';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Check if user has required verification level for an action
   */
  async checkLevelAccess(requiredLevel: 1 | 2 | 3): Promise<LevelAccessCheck> {
    try {
      const { data, error } = await this.supabase.rpc('check_level_requirements', {
        p_required_level: requiredLevel,
      });

      if (error) {
        throw error;
      }

      return data as LevelAccessCheck;
    } catch (err) {
      this.logger.warn(
        `RPC check_level_requirements failed, trying fallback via getVerificationProgress`,
        err,
      );

      try {
        // Fallback: Use getVerificationProgress which is more robust
        const progress = await this.getVerificationProgress();
        const currentLevel = progress.current_level;
        const allowed = currentLevel >= requiredLevel;

        return {
          allowed,
          current_level: currentLevel,
          required_level: requiredLevel,
          message: allowed ? 'Access granted' : `Verification level ${requiredLevel} required`,
          error: allowed ? undefined : 'Insufficient verification level',
        };
      } catch {
        const message =
          err instanceof Error ? err.message : 'No pudimos verificar el nivel de acceso';
        this.error.set(message);
        throw err;
      }
    }
  }

  /**
   * Update identity level data (for manual updates or after verification)
   */
  async updateIdentityLevel(updates: Partial<UserIdentityLevel>): Promise<UserIdentityLevel> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase
        .from('user_identity_levels')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.identityLevel.set(data as UserIdentityLevel);
      return data as UserIdentityLevel;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos actualizar el nivel de verificación';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get current level (1, 2, or 3)
   */
  async getCurrentLevel(): Promise<number> {
    try {
      await this.loadIdentityLevel();
      return this.currentLevel();
    } catch {
      return 1; // Default to Level 1 on error
    }
  }

  /**
   * Check if user can publish cars (requires Level 2)
   */
  async canPublishCars(): Promise<boolean> {
    const access = await this.checkLevelAccess(2);
    return access.allowed;
  }

  /**
   * Check if user can book expensive cars (requires Level 3)
   */
  async canBookExpensiveCars(): Promise<boolean> {
    const access = await this.checkLevelAccess(3);
    return access.allowed;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Refresh all verification data
   */
  async refresh(): Promise<void> {
    await Promise.all([this.loadIdentityLevel(), this.getVerificationProgress()]);
  }

  /**
   * Subscribe to realtime updates for verification changes
   * Call this when the verification page loads
   */
  async subscribeToRealtimeUpdates(): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return;
      }

      this.currentUserId = user.id;

      // Unsubscribe from previous channel if exists
      this.unsubscribeFromRealtime();

      // Create new channel for this user
      this.realtimeChannel = this.supabase
        .channel(`identity_level_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_identity_levels',
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            // Refresh progress when changes detected
            this.logger.debug('Realtime update detected, refreshing...');
            await this.getVerificationProgress();
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            this.logger.error('Realtime channel error');
          } else if (status === 'SUBSCRIBED') {
            this.logger.debug('Realtime subscription active');
          }
        });
    } catch (err) {
      this.logger.error('Failed to subscribe to realtime', err);
    }
  }

  /**
   * Unsubscribe from realtime updates
   */
  unsubscribeFromRealtime(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
    }
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.unsubscribeFromRealtime();
  }
}
