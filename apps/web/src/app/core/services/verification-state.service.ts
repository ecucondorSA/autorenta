import { Injectable, computed, inject, signal, OnDestroy } from '@angular/core';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';
import type { VerificationProgress } from './identity-level.service';

/**
 * Centralized verification state management with Realtime sync
 *
 * This service:
 * - Maintains reactive state for verification progress
 * - Subscribes to database changes via Supabase Realtime
 * - Notifies components when verification status changes
 * - Provides caching to reduce database calls
 */
@Injectable({
  providedIn: 'root',
})
export class VerificationStateService implements OnDestroy {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();

  // Reactive state
  readonly verificationProgress = signal<VerificationProgress | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed values
  readonly currentLevel = computed(() => this.verificationProgress()?.current_level ?? 1);
  readonly progressPercentage = computed(
    () => this.verificationProgress()?.progress_percentage ?? 0,
  );
  readonly isLevel1Complete = computed(() => this.currentLevel() >= 1);
  readonly isLevel2Complete = computed(() => this.currentLevel() >= 2);
  readonly isLevel3Complete = computed(() => this.currentLevel() >= 3);
  readonly emailVerified = computed(
    () => this.verificationProgress()?.requirements?.level_1?.email_verified ?? false,
  );
  readonly phoneVerified = computed(
    () => this.verificationProgress()?.requirements?.level_1?.phone_verified ?? false,
  );
  readonly documentsVerified = computed(
    () => this.verificationProgress()?.requirements?.level_2?.completed ?? false,
  );
  readonly selfieVerified = computed(
    () => this.verificationProgress()?.requirements?.level_3?.completed ?? false,
  );

  private realtimeChannel?: RealtimeChannel;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize Realtime subscriptions
   * Call this once when app starts or user logs in
   */
  async initialize(): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        console.log('[VerificationState] No user, skipping initialization');
        return;
      }

      // Load initial state
      await this.refreshProgress();

      // Subscribe to changes
      this.subscribeToChanges(user.id);

      console.log('[VerificationState] Initialized for user:', user.id);
    } catch (error) {
      console.error('[VerificationState] Initialization failed:', error);
      this.error.set('No se pudo inicializar el estado de verificación');
    }
  }

  /**
   * Refresh verification progress from database
   * Uses cache to avoid excessive calls
   */
  async refreshProgress(force = false): Promise<VerificationProgress | null> {
    const now = Date.now();

    // Check cache
    if (!force && this.verificationProgress() && now - this.lastFetchTime < this.CACHE_DURATION_MS) {
      console.log('[VerificationState] Using cached progress');
      return this.verificationProgress();
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.rpc('get_verification_progress');

      if (error) {
        throw error;
      }

      const progress = data as VerificationProgress;
      this.verificationProgress.set(progress);
      this.lastFetchTime = now;

      console.log('[VerificationState] Progress updated:', {
        level: progress.current_level,
        percentage: progress.progress_percentage,
      });

      return progress;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al obtener progreso de verificación';
      this.error.set(message);
      console.error('[VerificationState] Refresh failed:', error);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Subscribe to user_identity_levels changes via Realtime
   */
  private subscribeToChanges(userId: string): void {
    // Unsubscribe from previous channel if exists
    this.unsubscribe();

    // Create new channel
    this.realtimeChannel = this.supabase
      .channel(`verification_state:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_identity_levels',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('[VerificationState] Realtime update:', payload);

          // Refresh progress when changes detected
          await this.refreshProgress(true);

          // Emit event for notifications
          this.emitVerificationEvent(payload);
        },
      )
      .subscribe((status) => {
        console.log('[VerificationState] Realtime status:', status);

        if (status === 'SUBSCRIBED') {
          console.log('[VerificationState] Successfully subscribed to changes');
        }

        if (status === 'CHANNEL_ERROR') {
          console.error('[VerificationState] Realtime channel error');
          this.error.set('Error en sincronización en tiempo real');
        }
      });
  }

  /**
   * Unsubscribe from Realtime channel
   */
  unsubscribe(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
      console.log('[VerificationState] Unsubscribed from Realtime');
    }
  }

  /**
   * Emit custom events for notification system
   */
  private emitVerificationEvent(payload: any): void {
    const eventType = payload.eventType; // INSERT, UPDATE, DELETE
    const newData = payload.new;
    const oldData = payload.old;

    // Check what changed
    if (eventType === 'UPDATE') {
      // Email verified
      if (
        !oldData.email_verified_at &&
        newData.email_verified_at
      ) {
        this.dispatchEvent('email_verified');
      }

      // Phone verified
      if (
        !oldData.phone_verified_at &&
        newData.phone_verified_at
      ) {
        this.dispatchEvent('phone_verified');
      }

      // Documents verified (Level 2)
      if (
        oldData.current_level < 2 &&
        newData.current_level >= 2
      ) {
        this.dispatchEvent('level_2_achieved');
      }

      // Selfie verified (Level 3)
      if (
        !oldData.selfie_verified_at &&
        newData.selfie_verified_at
      ) {
        this.dispatchEvent('selfie_verified');
      }

      // Level 3 achieved
      if (
        oldData.current_level < 3 &&
        newData.current_level >= 3
      ) {
        this.dispatchEvent('level_3_achieved');
      }
    }
  }

  /**
   * Dispatch custom DOM event for notification system
   */
  private dispatchEvent(eventName: string): void {
    const event = new CustomEvent('verification-event', {
      detail: {
        type: eventName,
        timestamp: Date.now(),
        progress: this.verificationProgress(),
      },
    });

    window.dispatchEvent(event);
    console.log('[VerificationState] Event dispatched:', eventName);
  }

  /**
   * Listen to verification events
   * Returns unsubscribe function
   */
  addEventListener(callback: (event: CustomEvent) => void): () => void {
    const handler = (event: Event) => callback(event as CustomEvent);
    window.addEventListener('verification-event', handler);

    return () => {
      window.removeEventListener('verification-event', handler);
    };
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Clear cache and force refresh
   */
  async invalidateCache(): Promise<void> {
    this.lastFetchTime = 0;
    await this.refreshProgress(true);
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.unsubscribe();
  }
}
