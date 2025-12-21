import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { AuthVerificationStatus, VerificationBaseService } from '@core/services/verification/verification-base.service';
import type { AuthError } from '@supabase/supabase-js';

/**
 * Phone Verification Status (extends base with OTP-specific fields)
 */
export interface PhoneVerificationStatus extends AuthVerificationStatus {
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

type AuthErrorWithCode = AuthError & {
  code?: string;
  error_code?: string;
};

/**
 * Service for managing phone number verification via SMS OTP
 *
 * Extends VerificationBaseService with phone-specific functionality:
 * - Sending OTP codes via SMS
 * - Verifying OTP codes
 * - Phone-specific rate limiting (3 attempts per hour)
 * - Argentina phone number validation (+54)
 *
 * Base class provides:
 * - Cooldown management (calculateCooldownRemaining, startCooldownTimer)
 * - Auth listener initialization
 * - Status updates from user object
 * - Reactive state (signals)
 */
@Injectable({
  providedIn: 'root',
})
export class PhoneVerificationService extends VerificationBaseService<PhoneVerificationStatus> {
  // VerificationBaseService abstract properties
  protected readonly verificationType = 'phone' as const;
  protected readonly cooldownMs = 60 * 1000; // 60 seconds

  // Phone-specific rate limiting
  private readonly MAX_ATTEMPTS_PER_HOUR = 3;
  private otpAttempts: number[] = []; // Timestamps of OTP attempts
  private logger = inject(LoggerService).createChildLogger('PhoneVerificationService');

  constructor() {
    super();
    this.checkStatus().catch((err) => {
      this.logger.error('Failed to check initial phone status', { error: err });
    });
  }

  /**
   * Override extendStatus to add phone-specific fields
   */
  protected override extendStatus(baseStatus: AuthVerificationStatus): PhoneVerificationStatus {
    return {
      ...baseStatus,
      otpSent: this.statusSignal().otpSent ?? false,
    };
  }

  /**
   * Check current phone verification status (implements abstract method)
   */
  async checkStatus(): Promise<PhoneVerificationStatus> {
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

      this.logger.info('Fresh user data from server', {
        isVerified: user.phone_confirmed_at !== null,
      });

      this.updateStatusFromUser(user as unknown as Record<string, unknown>);
      return this.status();
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
   * Override updateStatusFromUser to include phone-specific logic
   */
  protected override updateStatusFromUser(user: Record<string, unknown>): void {
    super.updateStatusFromUser(user); // Call base implementation

    // Add phone-specific canResend logic (includes rate limiting)
    const currentStatus = this.statusSignal();
    const canResendWithRateLimit = currentStatus.canResend && this.canSendOTP();

    this.statusSignal.set({
      ...currentStatus,
      canResend: canResendWithRateLimit,
      otpSent: currentStatus.otpSent && !currentStatus.isVerified,
    } as PhoneVerificationStatus);
  }

  /**
   * Send OTP code to phone number (implements abstract sendVerification)
   * @param phone Phone number in E.164 format (e.g., +5491123456789)
   * @param countryCode Country code (default: +54 for Argentina)
   */
  async sendVerification(phone: string, countryCode: string = '+54'): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Early validation: check if phone is empty or too short
      const cleanedPhone = phone?.trim() || '';
      if (!cleanedPhone || cleanedPhone.length < 7) {
        const formatHint = this.getPhoneFormatHint(countryCode);
        throw new Error(
          `Por favor ingresa un número de teléfono válido. Formato esperado: ${formatHint}`,
        );
      }

      // Check cooldown (using base class method)
      this.checkCooldown();

      // Check phone-specific rate limiting
      if (!this.canSendOTP()) {
        throw new Error(
          'Has alcanzado el límite de intentos por hora. Por favor intenta más tarde.',
        );
      }

      // Format phone number (E.164 format)
      const formattedPhone = this.formatPhoneNumber(cleanedPhone, countryCode);

      this.logger.info('Phone formatting processed', {
        countryCode,
      });

      // Check if formatted phone is empty or invalid
      if (!formattedPhone || formattedPhone.length < 8) {
        const formatHint = this.getPhoneFormatHint(countryCode);
        throw new Error(`Número de teléfono inválido. Formato esperado: ${formatHint}`);
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(formattedPhone, countryCode)) {
        const formatHint = this.getPhoneFormatHint(countryCode);
        this.logger.warn('Invalid phone format provided', {
          countryCode,
          formatHint,
        });
        throw new Error(`Número de teléfono inválido. Formato esperado: ${formatHint}`);
      }

      // Send OTP via Supabase Auth
      const { error } = await this.supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms',
        },
      });

      if (error) {
        const extendedError = error as AuthErrorWithCode;
        const errorCode = extendedError.code || extendedError.error_code || '';
        const errorMessage = extendedError.message || '';

        // Provide more user-friendly error messages
        // Check for phone provider errors (multiple ways Supabase can return this)
        if (
          errorCode === 'phone_provider_disabled' ||
          errorCode === 'provider_disabled' ||
          errorMessage?.includes('phone_provider_disabled') ||
          errorMessage?.includes('Unsupported phone provider') ||
          errorMessage?.includes('phone provider') ||
          errorMessage?.includes('SMS provider')
        ) {
          throw new Error(
            'El servicio de SMS no está configurado para este país. Por favor contacta al soporte o intenta con otro número.',
          );
        }

        // Handle other Supabase errors
        if (errorCode === 'phone_exists' || errorMessage?.includes('phone_exists')) {
          throw new Error('Este número de teléfono ya está registrado.');
        }

        if (
          errorCode === 'over_sms_send_rate_limit' ||
          errorMessage?.includes('over_sms_send_rate_limit') ||
          errorMessage?.includes('rate limit')
        ) {
          throw new Error('Has excedido el límite de envíos. Por favor intenta más tarde.');
        }

        // Handle invalid phone format errors from Supabase
        if (
          errorCode === 'validation_failed' ||
          errorMessage?.includes('invalid phone') ||
          errorMessage?.includes('phone number')
        ) {
          const formatHint = this.getPhoneFormatHint(countryCode);
          throw new Error(
            `Número de teléfono inválido según el proveedor. Formato esperado: ${formatHint}`,
          );
        }

        // Log the full error for debugging
        this.logger.error('Supabase authentication error', {
          code: errorCode,
        });

        // Re-throw original error if we don't have a specific message
        throw error;
      }

      // Update tracking (using base class method + phone-specific)
      this.recordSendTime();
      this.otpAttempts.push(Date.now());
      this.cleanupOldAttempts();

      // Call RPC function for logging
      await this.supabase.rpc('send_phone_otp', {
        p_phone: formattedPhone,
        p_country_code: countryCode,
      });

      // Update phone-specific status
      const currentStatus = this.statusSignal();
      this.statusSignal.set({
        ...currentStatus,
        otpSent: true,
        value: formattedPhone,
      } as PhoneVerificationStatus);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos enviar el código SMS';
      this.error.set(message);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Send OTP code to phone number (convenience method, delegates to sendVerification)
   * @deprecated Use sendVerification instead
   */
  async sendOTP(phone: string, countryCode: string = '+54'): Promise<boolean> {
    await this.sendVerification(phone, countryCode);
    return true;
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
      await this.checkStatus();

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
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    // Remove all non-digit characters except +
    let cleaned = phone.trim().replace(/[^\d+]/g, '');

    // If already starts with +, validate and return
    if (cleaned.startsWith('+')) {
      // If it already has a country code, use it (might be different from selected)
      // But we'll still validate it later
      return cleaned;
    }

    // If empty after cleaning, return empty
    if (!cleaned || cleaned.length === 0) {
      return '';
    }

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    // If empty after removing zeros, return empty
    if (!cleaned || cleaned.length === 0) {
      return '';
    }

    // Add country code
    return `${countryCode}${cleaned}`;
  }

  /**
   * Get phone format hint for a country code
   */
  private getPhoneFormatHint(countryCode: string): string {
    const hints: Record<string, string> = {
      '+54': '+54 seguido de 10 dígitos (ej: +5491123456789)',
      '+1': '+1 seguido de 10 dígitos (ej: +15551234567)',
      '+52': '+52 seguido de 10 dígitos (ej: +525512345678)',
      '+55': '+55 seguido de 10-11 dígitos (ej: +5511987654321)',
      '+56': '+56 seguido de 9 dígitos (ej: +56912345678)',
    };
    return hints[countryCode] || 'formato E.164 internacional';
  }

  /**
   * Validate phone number format (E.164)
   * Supports multiple countries with different digit lengths
   */
  private isValidPhoneNumber(phone: string, countryCode?: string): boolean {
    // E.164 format: +[country code][number]
    // Must start with + and have at least 7 digits after country code
    if (!phone.startsWith('+')) {
      return false;
    }

    // Remove the + and validate
    const withoutPlus = phone.substring(1);

    // Must contain only digits after the +
    if (!/^\d+$/.test(withoutPlus)) {
      return false;
    }

    // Country-specific validation
    if (phone.startsWith('+54')) {
      // Argentina: +54 followed by 10 digits (total 12 digits after +)
      return /^\+54\d{10}$/.test(phone);
    } else if (phone.startsWith('+1')) {
      // USA/Canada: +1 followed by 10 digits (total 11 digits after +)
      return /^\+1\d{10}$/.test(phone);
    } else if (phone.startsWith('+52')) {
      // Mexico: +52 followed by 10 digits (total 12 digits after +)
      return /^\+52\d{10}$/.test(phone);
    } else if (phone.startsWith('+55')) {
      // Brazil: +55 followed by 10-11 digits (total 12-13 after +)
      return /^\+55\d{10,11}$/.test(phone);
    } else if (phone.startsWith('+56')) {
      // Chile: +56 followed by 9 digits (total 11 digits after +)
      return /^\+56\d{9}$/.test(phone);
    }

    // If country code is provided but doesn't match, validate against it
    if (countryCode && !phone.startsWith(countryCode)) {
      return false;
    }

    // Generic validation: at least 7 digits after country code, max 15 total
    // E.164 allows 1-15 digits total (including country code)
    const totalDigits = withoutPlus.length;
    return totalDigits >= 8 && totalDigits <= 15;
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
   * Override startCooldownTimer to include phone-specific rate limiting
   */
  override startCooldownTimer(callback: (seconds: number) => void): () => void {
    const interval = setInterval(() => {
      const remaining = this.calculateCooldownRemaining();
      const currentStatus = this.statusSignal();

      callback(remaining);

      if (remaining === 0 && !currentStatus.isVerified) {
        // Phone-specific: check rate limiting before allowing resend
        this.statusSignal.set({
          ...currentStatus,
          canResend: this.canSendOTP(),
          cooldownSeconds: 0,
        } as PhoneVerificationStatus);
        clearInterval(interval);
      } else {
        this.statusSignal.set({
          ...currentStatus,
          cooldownSeconds: remaining,
        } as PhoneVerificationStatus);
      }
    }, 1000);

    return () => clearInterval(interval);
  }

  /**
   * Subscribe to phone verification changes (convenience method, delegates to base)
   * @deprecated Use subscribeToChanges instead
   */
  subscribeToPhoneChanges(callback: (verified: boolean) => void): () => void {
    return this.subscribeToChanges(callback);
  }

  /**
   * Convenience method for backward compatibility
   * @deprecated Use checkStatus instead
   */
  async checkPhoneStatus(): Promise<PhoneVerificationStatus> {
    return this.checkStatus();
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
    this.statusSignal.set({
      ...currentStatus,
      otpSent: false,
    } as PhoneVerificationStatus);
  }
}
