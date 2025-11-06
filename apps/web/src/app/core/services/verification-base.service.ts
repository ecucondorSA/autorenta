import { inject, signal, Signal } from '@angular/core';
import type { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Generic Verification Status
 */
export interface VerificationStatus {
  isVerified: boolean;
  value: string | null; // email or phone
  verifiedAt: string | null;
  canResend: boolean;
  cooldownSeconds: number;
}

/**
 * Verification Type
 */
export type VerificationType = 'email' | 'phone';

/**
 * Base Service for Email and Phone Verification
 *
 * Consolidates 95% of duplicated code between PhoneVerificationService
 * and EmailVerificationService.
 *
 * Shared functionality:
 * - Cooldown management (calculateCooldownRemaining, startCooldownTimer)
 * - Auth listener initialization
 * - Status updates from user object
 * - Reactive state (signals)
 * - Rate limiting
 *
 * Concrete services must implement:
 * - sendVerification(): Send OTP/email
 * - verifyCode(): Verify OTP code (phone only)
 * - checkStatus(): Check verification status
 *
 * Usage:
 * ```typescript
 * export class PhoneVerificationService extends VerificationBaseService {
 *   protected readonly verificationType = 'phone' as const;
 *   protected readonly cooldownMs = 60 * 1000;
 *
 *   async sendVerification(phone: string): Promise<void> {
 *     // Phone-specific logic
 *   }
 * }
 * ```
 */
export abstract class VerificationBaseService<
  TStatus extends VerificationStatus = VerificationStatus,
> {
  protected readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  protected lastSendTime: number = 0;

  /**
   * Verification type (email or phone)
   * Must be set by concrete service
   */
  protected abstract readonly verificationType: VerificationType;

  /**
   * Cooldown duration in milliseconds
   * Must be set by concrete service (default: 60 seconds)
   */
  protected abstract readonly cooldownMs: number;

  /**
   * Field name in Supabase user object for verification status
   * email: 'email_confirmed_at'
   * phone: 'phone_confirmed_at'
   */
  protected get confirmedAtField(): string {
    return this.verificationType === 'email' ? 'email_confirmed_at' : 'phone_confirmed_at';
  }

  /**
   * Field name in Supabase user object for the value
   * email: 'email'
   * phone: 'phone'
   */
  protected get valueField(): string {
    return this.verificationType;
  }

  // Reactive state
  readonly status: Signal<TStatus>;
  protected readonly statusSignal = signal<TStatus>({} as TStatus);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.status = this.statusSignal.asReadonly() as Signal<TStatus>;
    this.initializeAuthListener();
  }

  /**
   * Calculate remaining cooldown time in seconds
   * 100% identical in both services
   */
  protected calculateCooldownRemaining(): number {
    if (this.lastSendTime === 0) {
      return 0;
    }

    const elapsed = Date.now() - this.lastSendTime;
    const remaining = Math.ceil((this.cooldownMs - elapsed) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * Initialize auth listener for automatic status updates
   * 99% identical in both services
   */
  protected initializeAuthListener(): void {
    this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if ((event === 'USER_UPDATED' || event === 'SIGNED_IN') && session?.user) {
        this.updateStatusFromUser(session.user as Record<string, unknown>);
      }
    });
  }

  /**
   * Update status from user object
   * 95% identical in both services (only field names differ)
   */
  protected updateStatusFromUser(user: Record<string, unknown>): void {
    const isVerified =
      user[this.confirmedAtField] !== null && user[this.confirmedAtField] !== undefined;
    const cooldownRemaining = this.calculateCooldownRemaining();

    const baseStatus: VerificationStatus = {
      isVerified,
      value: (user[this.valueField] as string) ?? null,
      verifiedAt: (user[this.confirmedAtField] as string) ?? null,
      canResend: !isVerified && cooldownRemaining === 0,
      cooldownSeconds: cooldownRemaining,
    };

    // Let concrete service extend with additional fields
    this.statusSignal.set(this.extendStatus(baseStatus) as TStatus);
  }

  /**
   * Extension point for concrete services to add custom fields
   * Override this in concrete service if needed
   */
  protected extendStatus(baseStatus: VerificationStatus): TStatus {
    return baseStatus as TStatus;
  }

  /**
   * Start cooldown timer (updates UI every second)
   * 99% identical in both services
   */
  startCooldownTimer(callback: (seconds: number) => void): () => void {
    const interval = setInterval(() => {
      const remaining = this.calculateCooldownRemaining();
      const currentStatus = this.statusSignal();

      callback(remaining);

      if (remaining === 0 && !currentStatus.isVerified) {
        this.statusSignal.set({
          ...currentStatus,
          canResend: true,
          cooldownSeconds: 0,
        } as TStatus);
        clearInterval(interval);
      } else {
        this.statusSignal.set({
          ...currentStatus,
          cooldownSeconds: remaining,
        } as TStatus);
      }
    }, 1000);

    return () => clearInterval(interval);
  }

  /**
   * Subscribe to verification changes (real-time)
   * 99% identical in both services
   */
  subscribeToChanges(callback: (verified: boolean) => void): () => void {
    const subscription = this.supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if ((event === 'USER_UPDATED' || event === 'SIGNED_IN') && session?.user) {
          const user = session.user as Record<string, unknown>;
          const isVerified =
            user[this.confirmedAtField] !== null && user[this.confirmedAtField] !== undefined;
          this.updateStatusFromUser(user);
          callback(isVerified);
        }
      },
    );

    return () => {
      subscription.data.subscription.unsubscribe();
    };
  }

  /**
   * Check if cooldown has passed
   */
  protected hasPassedCooldown(): boolean {
    return this.calculateCooldownRemaining() === 0;
  }

  /**
   * Set last send time and update status
   */
  protected recordSendTime(): void {
    this.lastSendTime = Date.now();

    const currentStatus = this.statusSignal();
    this.statusSignal.set({
      ...currentStatus,
      canResend: false,
      cooldownSeconds: Math.ceil(this.cooldownMs / 1000),
    } as TStatus);
  }

  /**
   * Check cooldown and throw error if not passed
   */
  protected checkCooldown(errorMessage?: string): void {
    const cooldownRemaining = this.calculateCooldownRemaining();
    if (cooldownRemaining > 0) {
      throw new Error(
        errorMessage ??
          `Por favor espera ${cooldownRemaining} segundos antes de reintentar`,
      );
    }
  }

  /**
   * Abstract method: Send verification (OTP or email)
   * Must be implemented by concrete service
   */
  abstract sendVerification(...args: unknown[]): Promise<void>;

  /**
   * Abstract method: Check verification status
   * Must be implemented by concrete service
   */
  abstract checkStatus(): Promise<TStatus>;
}
