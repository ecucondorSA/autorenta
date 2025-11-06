import { inject, Injectable, signal } from '@angular/core';
import type { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Phone Verification Status
 */
export interface PhoneVerificationStatus {
  isVerified: boolean;
  phone: string | null;
  verifiedAt: string | null;
  canResend: boolean;
  cooldownSeconds: number;
  otpSent: boolean;
}

/**
 * OTP Verification Result
 */
export interface OTPVerificationResult {
  success: boolean;
  verified: boolean;
  error?: string;
  message?: string;
}

/**
 * Service for managing phone number verification via SMS OTP
 *
 * Handles:
 * - Sending OTP codes via SMS
 * - Verifying OTP codes
 * - Phone verification status
 * - Rate limiting for OTP attempts
 * - Real-time updates when phone is verified
 */
@Injectable({
  providedIn: 'root',
})
export class PhoneVerificationService {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private lastOTPSendTime: number = 0;
  private readonly OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds
  private readonly MAX_ATTEMPTS_PER_HOUR = 3;
  private otpAttempts: number[] = []; // Timestamps of OTP attempts

  // Reactive state
  readonly status = signal<PhoneVerificationStatus>({
    isVerified: false,
    phone: null,
    verifiedAt: null,
    canResend: true,
    cooldownSeconds: 0,
    otpSent: false,
  });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.initializeAuthListener();
    this.checkPhoneStatus().catch((err) => {
      console.error('Failed to check initial phone status:', err);
    });
  }

  /**
   * Check current phone verification status
   */
  async checkPhoneStatus(): Promise<PhoneVerificationStatus> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // IMPORTANT: Refresh session first to get fresh user data from server
      // This prevents stale cache issues where phone_confirmed_at might be outdated
      await this.supabase.auth.refreshSession();

      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      console.log('[PhoneVerificationService] Fresh user data from server:', {
        phone: user.phone,
        phone_confirmed_at: user.phone_confirmed_at,
        isVerified: user.phone_confirmed_at !== null,
      });

      const isVerified = user.phone_confirmed_at !== null;
      const cooldownRemaining = this.calculateCooldownRemaining();

      const statusData: PhoneVerificationStatus = {
        isVerified,
        phone: user.phone ?? null,
        verifiedAt: user.phone_confirmed_at ?? null,
        canResend: !isVerified && cooldownRemaining === 0 && this.canSendOTP(),
        cooldownSeconds: cooldownRemaining,
        otpSent: this.status().otpSent,
      };

      this.status.set(statusData);
      return statusData;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos verificar el estado del teléfono';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Send OTP code to phone number
   * @param phone Phone number in E.164 format (e.g., +5491123456789)
   * @param countryCode Country code (default: +54 for Argentina)
   */
  async sendOTP(phone: string, countryCode: string = '+54'): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Check cooldown
      const cooldownRemaining = this.calculateCooldownRemaining();
      if (cooldownRemaining > 0) {
        throw new Error(
          `Por favor espera ${cooldownRemaining} segundos antes de reenviar el código`,
        );
      }

      // Check rate limiting
      if (!this.canSendOTP()) {
        throw new Error(
          'Has alcanzado el límite de intentos por hora. Por favor intenta más tarde.',
        );
      }

      // Format phone number (E.164 format)
      const formattedPhone = this.formatPhoneNumber(phone, countryCode);

      // Validate phone number format
      if (!this.isValidPhoneNumber(formattedPhone)) {
        throw new Error('Número de teléfono inválido. Por favor verifica el formato.');
      }

      // Send OTP via Supabase Auth
      const { error } = await this.supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms',
        },
      });

      if (error) {
        throw error;
      }

      // Update tracking
      this.lastOTPSendTime = Date.now();
      this.otpAttempts.push(Date.now());
      this.cleanupOldAttempts();

      // Call RPC function for logging
      await this.supabase.rpc('send_phone_otp', {
        p_phone: formattedPhone,
        p_country_code: countryCode,
      });

      // Update status
      const currentStatus = this.status();
      this.status.set({
        ...currentStatus,
        otpSent: true,
        phone: formattedPhone,
        canResend: false,
        cooldownSeconds: 60,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos enviar el código SMS';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Verify OTP code
   * @param phone Phone number
   * @param token 6-digit OTP code
   */
  async verifyOTP(phone: string, token: string): Promise<OTPVerificationResult> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Validate token format
      if (!/^\d{6}$/.test(token)) {
        throw new Error('El código debe tener 6 dígitos');
      }

      // Verify OTP via Supabase Auth
      const {
        data: { user },
        error,
      } = await this.supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) {
        throw error;
      }

      if (!user) {
        throw new Error('Verificación fallida. Por favor intenta nuevamente.');
      }

      // Call RPC function for post-verification
      await this.supabase.rpc('verify_phone_otp', {
        p_phone: phone,
        p_token: token,
      });

      // Update status
      await this.checkPhoneStatus();

      return {
        success: true,
        verified: true,
        message: 'Teléfono verificado exitosamente',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Código inválido o expirado';
      this.error.set(message);

      return {
        success: false,
        verified: false,
        error: message,
      };
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string, countryCode: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If already starts with +, return as is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    // Add country code
    return `${countryCode}${cleaned}`;
  }

  /**
   * Validate phone number format (E.164)
   */
  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[country code][number]
    // Argentina: +54 followed by 10 digits
    return /^\+54\d{10}$/.test(phone);
  }

  /**
   * Check if user can send OTP (rate limiting)
   */
  private canSendOTP(): boolean {
    this.cleanupOldAttempts();
    return this.otpAttempts.length < this.MAX_ATTEMPTS_PER_HOUR;
  }

  /**
   * Remove attempts older than 1 hour
   */
  private cleanupOldAttempts(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.otpAttempts = this.otpAttempts.filter((timestamp) => timestamp > oneHourAgo);
  }

  /**
   * Calculate remaining cooldown time in seconds
   */
  private calculateCooldownRemaining(): number {
    if (this.lastOTPSendTime === 0) {
      return 0;
    }

    const elapsed = Date.now() - this.lastOTPSendTime;
    const remaining = Math.ceil((this.OTP_COOLDOWN_MS - elapsed) / 1000);
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
  private updateStatusFromUser(user: { phone?: string; phone_confirmed_at?: string }): void {
    const isVerified = user.phone_confirmed_at !== null && user.phone_confirmed_at !== undefined;
    const cooldownRemaining = this.calculateCooldownRemaining();

    this.status.set({
      isVerified,
      phone: user.phone ?? null,
      verifiedAt: user.phone_confirmed_at ?? null,
      canResend: !isVerified && cooldownRemaining === 0 && this.canSendOTP(),
      cooldownSeconds: cooldownRemaining,
      otpSent: this.status().otpSent && !isVerified,
    });
  }

  /**
   * Subscribe to phone verification changes (real-time)
   */
  subscribeToPhoneChanges(callback: (verified: boolean) => void): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'USER_UPDATED' && session?.user) {
        const isVerified = session.user.phone_confirmed_at !== null;
        this.updateStatusFromUser(session.user);
        callback(isVerified);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
          canResend: this.canSendOTP(),
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
   * Get number of remaining OTP attempts
   */
  getRemainingAttempts(): number {
    this.cleanupOldAttempts();
    return Math.max(0, this.MAX_ATTEMPTS_PER_HOUR - this.otpAttempts.length);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Reset OTP sent state (for UI)
   */
  resetOTPSentState(): void {
    const currentStatus = this.status();
    this.status.set({
      ...currentStatus,
      otpSent: false,
    });
  }
}
