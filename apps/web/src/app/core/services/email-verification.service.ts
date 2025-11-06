import { Injectable } from '@angular/core';
import { VerificationBaseService, VerificationStatus } from './verification-base.service';

/**
 * Email Verification Status (identical to base VerificationStatus)
 */
export type EmailVerificationStatus = VerificationStatus;

/**
 * Service for managing email verification
 *
 * Extends VerificationBaseService with email-specific functionality:
 * - Resending verification emails via Supabase Auth
 * - Email verification status checks
 *
 * Base class provides:
 * - Cooldown management (calculateCooldownRemaining, startCooldownTimer)
 * - Auth listener initialization
 * - Status updates from user object
 * - Reactive state (signals)
 * - Real-time subscription to verification changes
 */
@Injectable({
  providedIn: 'root',
})
export class EmailVerificationService extends VerificationBaseService<EmailVerificationStatus> {
  // VerificationBaseService abstract properties
  protected readonly verificationType = 'email' as const;
  protected readonly cooldownMs = 60 * 1000; // 60 seconds

  constructor() {
    super();
    this.checkStatus().catch((err) => {
      console.error('Failed to check initial email status:', err);
    });
  }

  /**
   * Check current email verification status (implements abstract method)
   */
  async checkStatus(): Promise<EmailVerificationStatus> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Use base class method to update status
      this.updateStatusFromUser(user as Record<string, unknown>);
      return this.status();
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
   * Convenience method for backward compatibility
   * @deprecated Use checkStatus instead
   */
  async checkEmailStatus(): Promise<EmailVerificationStatus> {
    return this.checkStatus();
  }

  /**
   * Resend verification email (implements abstract sendVerification)
   */
  async sendVerification(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Check cooldown (using base class method)
      this.checkCooldown();

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

      // Update tracking (using base class method)
      this.recordSendTime();

      // Update status
      await this.checkStatus();
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
   * Resend verification email (convenience method, delegates to sendVerification)
   * @deprecated Use sendVerification instead
   */
  async resendVerificationEmail(): Promise<boolean> {
    await this.sendVerification();
    return true;
  }

  /**
   * Subscribe to email verification changes (convenience method, delegates to base)
   * @deprecated Use subscribeToChanges instead
   */
  subscribeToEmailChanges(callback: (verified: boolean) => void): () => void {
    return this.subscribeToChanges(callback);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
