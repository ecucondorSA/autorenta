import { inject, Injectable, signal } from '@angular/core';
import type { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Email Verification Status
 */
export interface EmailVerificationStatus {
  isVerified: boolean;
  email: string | null;
  verifiedAt: string | null;
  canResend: boolean;
  cooldownSeconds: number;
}

/**
 * Service for managing email verification
 *
 * Handles:
 * - Email verification status checks
 * - Resending verification emails
 * - Real-time updates when email is confirmed
 * - Rate limiting for resend attempts
 */
@Injectable({
  providedIn: 'root',
})
export class EmailVerificationService {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private lastResendTime: number = 0;
  private readonly RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

  // Reactive state
  readonly status = signal<EmailVerificationStatus>({
    isVerified: false,
    email: null,
    verifiedAt: null,
    canResend: true,
    cooldownSeconds: 0,
  });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.initializeAuthListener();
    this.checkEmailStatus().catch((err) => {
      console.error('Failed to check initial email status:', err);
    });
  }

  /**
   * Check current email verification status
   */
  async checkEmailStatus(): Promise<EmailVerificationStatus> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const isVerified = user.email_confirmed_at !== null;
      const cooldownRemaining = this.calculateCooldownRemaining();

      const statusData: EmailVerificationStatus = {
        isVerified,
        email: user.email ?? null,
        verifiedAt: user.email_confirmed_at ?? null,
        canResend: !isVerified && cooldownRemaining === 0,
        cooldownSeconds: cooldownRemaining,
      };

      this.status.set(statusData);
      return statusData;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos verificar el estado del email';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Check cooldown
      const cooldownRemaining = this.calculateCooldownRemaining();
      if (cooldownRemaining > 0) {
        throw new Error(
          `Por favor espera ${cooldownRemaining} segundos antes de reenviar el email`,
        );
      }

      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      if (user.email_confirmed_at) {
        throw new Error('El email ya está verificado');
      }

      // Call RPC function to trigger resend (actual sending by Supabase Auth)
      const { data, error: rpcError } = await this.supabase.rpc('resend_verification_email');

      if (rpcError) {
        throw rpcError;
      }

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        throw new Error(result.error ?? 'No pudimos reenviar el email de verificación');
      }

      // Update last resend time
      this.lastResendTime = Date.now();

      // Update status
      await this.checkEmailStatus();

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos reenviar el email de verificación';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Subscribe to email verification changes (real-time)
   */
  subscribeToEmailChanges(callback: (verified: boolean) => void): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'USER_UPDATED' && session?.user) {
        const isVerified = session.user.email_confirmed_at !== null;
        this.updateStatusFromUser(session.user);
        callback(isVerified);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Calculate remaining cooldown time in seconds
   */
  private calculateCooldownRemaining(): number {
    if (this.lastResendTime === 0) {
      return 0;
    }

    const elapsed = Date.now() - this.lastResendTime;
    const remaining = Math.ceil((this.RESEND_COOLDOWN_MS - elapsed) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * Initialize auth listener for automatic status updates
   */
  private initializeAuthListener(): void {
    this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if ((event === 'USER_UPDATED' || event === 'SIGNED_IN') && session?.user) {
        this.updateStatusFromUser(session.user);
      }
    });
  }

  /**
   * Update status from user object
   */
  private updateStatusFromUser(user: { email?: string; email_confirmed_at?: string }): void {
    const isVerified = user.email_confirmed_at !== null && user.email_confirmed_at !== undefined;
    const cooldownRemaining = this.calculateCooldownRemaining();

    this.status.set({
      isVerified,
      email: user.email ?? null,
      verifiedAt: user.email_confirmed_at ?? null,
      canResend: !isVerified && cooldownRemaining === 0,
      cooldownSeconds: cooldownRemaining,
    });
  }

  /**
   * Start cooldown timer (updates UI every second)
   */
  startCooldownTimer(callback: (seconds: number) => void): () => void {
    const interval = setInterval(() => {
      const remaining = this.calculateCooldownRemaining();
      const currentStatus = this.status();

      if (remaining === 0 && !currentStatus.isVerified) {
        this.status.set({
          ...currentStatus,
          canResend: true,
          cooldownSeconds: 0,
        });
        clearInterval(interval);
      } else {
        this.status.set({
          ...currentStatus,
          cooldownSeconds: remaining,
        });
      }

      callback(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
