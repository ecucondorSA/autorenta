import { Injectable, inject, signal } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

export type VerificationChannel = 'sms' | 'whatsapp';

export interface WhatsAppVerificationStatus {
  isVerified: boolean;
  otpSent: boolean;
  channel: VerificationChannel;
  phone?: string;
  canResend: boolean;
  cooldownSeconds: number;
  error?: string;
}

export interface OTPResult {
  success: boolean;
  verified?: boolean;
  error?: string;
  message?: string;
}

/**
 * WhatsAppVerificationService - Verificación via WhatsApp
 *
 * Alternativa a SMS para LATAM donde WhatsApp tiene 95%+ penetración:
 * - Delivery más confiable
 * - Sin rate limits de carriers
 * - Más barato que SMS
 *
 * Usa Edge Function para enviar OTP via WhatsApp Business API
 */
@Injectable({ providedIn: 'root' })
export class WhatsAppVerificationService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService).createChildLogger('WhatsAppVerification');

  // Estado
  readonly status = signal<WhatsAppVerificationStatus>({
    isVerified: false,
    otpSent: false,
    channel: 'whatsapp',
    canResend: true,
    cooldownSeconds: 0,
  });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Cooldown
  private lastSentTime = 0;
  private readonly COOLDOWN_MS = 60 * 1000; // 60 seconds
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Enviar OTP via WhatsApp
   */
  async sendOTP(phone: string, countryCode: string = '+54'): Promise<OTPResult> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Validar cooldown
      const cooldownRemaining = this.getCooldownRemaining();
      if (cooldownRemaining > 0) {
        throw new Error(`Esperá ${cooldownRemaining} segundos antes de reenviar`);
      }

      // Formatear teléfono
      const formattedPhone = this.formatPhone(phone, countryCode);
      if (!formattedPhone) {
        throw new Error('Número de teléfono inválido');
      }

      // Llamar Edge Function para enviar OTP via WhatsApp
      const { data, error } = await this.supabase.functions.invoke('send-whatsapp-otp', {
        body: {
          phone: formattedPhone,
          channel: 'whatsapp',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Error al enviar código');

      // Actualizar estado
      this.lastSentTime = Date.now();
      this.startCooldownTimer();

      this.status.update(s => ({
        ...s,
        otpSent: true,
        phone: formattedPhone,
        canResend: false,
        cooldownSeconds: 60,
      }));

      this.logger.info('WhatsApp OTP sent', { phone: formattedPhone });

      return {
        success: true,
        message: 'Código enviado por WhatsApp',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar código';
      this.error.set(message);
      this.logger.error('Failed to send WhatsApp OTP', { error: err });

      return {
        success: false,
        error: message,
      };
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Verificar código OTP
   */
  async verifyOTP(phone: string, code: string): Promise<OTPResult> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Validar formato del código
      if (!/^\d{6}$/.test(code)) {
        throw new Error('El código debe tener 6 dígitos');
      }

      // Llamar Edge Function para verificar
      const { data, error } = await this.supabase.functions.invoke('verify-whatsapp-otp', {
        body: {
          phone,
          code,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Código inválido');

      // Actualizar estado
      this.status.update(s => ({
        ...s,
        isVerified: true,
        otpSent: false,
      }));

      this.logger.info('WhatsApp OTP verified', { phone });

      return {
        success: true,
        verified: true,
        message: 'Teléfono verificado exitosamente',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Código inválido';
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
   * Formatear número de teléfono
   */
  private formatPhone(phone: string, countryCode: string): string | null {
    if (!phone) return null;

    let cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) return cleaned;

    cleaned = cleaned.replace(/^0+/, '');
    if (!cleaned) return null;

    return `${countryCode}${cleaned}`;
  }

  /**
   * Obtener segundos restantes de cooldown
   */
  private getCooldownRemaining(): number {
    const elapsed = Date.now() - this.lastSentTime;
    const remaining = Math.max(0, Math.ceil((this.COOLDOWN_MS - elapsed) / 1000));
    return remaining;
  }

  /**
   * Iniciar timer de cooldown
   */
  private startCooldownTimer(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }

    this.cooldownInterval = setInterval(() => {
      const remaining = this.getCooldownRemaining();
      this.status.update(s => ({
        ...s,
        cooldownSeconds: remaining,
        canResend: remaining === 0,
      }));

      if (remaining === 0 && this.cooldownInterval) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
      }
    }, 1000);
  }

  /**
   * Limpiar error
   */
  clearError(): void {
    this.error.set(null);
  }
}
