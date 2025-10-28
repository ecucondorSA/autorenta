import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PaymentIntent } from '../models';
import { injectSupabase } from './supabase-client.service';
import { FxService } from './fx.service';

/**
 * PaymentsService
 *
 * Handles payment intent creation and status tracking for bookings.
 *
 * CRITICAL: Payment Architecture (Updated Oct 2025)
 * ================================================
 *
 * PRODUCTION (Real Money):
 * - Payments processed via MercadoPago
 * - Webhooks handled by Supabase Edge Function: mercadopago-webhook
 * - URL: https://[project].supabase.co/functions/v1/mercadopago-webhook
 * - Token stored in Supabase secrets: MERCADOPAGO_ACCESS_TOKEN
 *
 * DEVELOPMENT (Mock Testing):
 * - Optional: Cloudflare Worker for local mock webhooks
 * - URL: http://localhost:8787/webhooks/payments (via wrangler dev)
 * - Methods: markAsPaid(), triggerMockPayment() (protected by production guards)
 *
 * Methods in this service:
 * - createIntent() - Creates payment intent for booking
 * - getStatus() - Retrieves payment intent status
 * - markAsPaid() - [DEV ONLY] Simulates payment completion via mock webhook
 * - triggerMockPayment() - [DEV ONLY] Triggers mock webhook for booking
 *
 * Production Protection:
 * - Both mock methods throw errors when environment.production = true
 * - Real payments are processed asynchronously via MP webhook
 * - No manual payment confirmation needed in production
 *
 * See: /home/edu/autorenta/CLAUDE.md (Payment Architecture section)
 * See: /home/edu/autorenta/functions/workers/payments_webhook/README.md
 */
@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private readonly supabase = injectSupabase();
  private readonly fxService = inject(FxService);

  async createIntent(bookingId: string): Promise<PaymentIntent> {
    // Obtener datos del booking para el payment intent
    const { data: booking, error: bookingError } = await this.supabase
      .from('bookings')
      .select('id, total_amount, currency, renter_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking no encontrado: ${bookingId}`);
    }

    const currency = (booking.currency ?? 'USD').toUpperCase();
    const totalAmount = Number(booking.total_amount ?? 0);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error(`Monto inválido para el booking ${bookingId}`);
    }

    const fxRate = await this.fxService.getCurrentRateAsync('USD', 'ARS');
    if (!Number.isFinite(fxRate) || fxRate <= 0) {
      throw new Error('No se pudo obtener la tasa de cambio vigente');
    }

    const amountUsdRaw = currency === 'USD' ? totalAmount : totalAmount / fxRate;
    const amountArsRaw = currency === 'ARS' ? totalAmount : totalAmount * fxRate;

    const amountUsd = Number(amountUsdRaw.toFixed(2));
    const amountArs = Number(amountArsRaw.toFixed(2));

    const { data, error } = await this.supabase
      .from('payment_intents')
      .insert({
        booking_id: bookingId,
        user_id: booking.renter_id,
        intent_type: 'booking',
        amount_usd: amountUsd,
        amount_ars: amountArs,
        fx_rate: fxRate,
        status: 'pending',
        description: `Pago de reserva ${bookingId.substring(0, 8)}`,
        is_preauth: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Error al crear payment intent: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
    return data as PaymentIntent;
  }

  /**
   * @deprecated NO usar en producción. Solo para desarrollo/testing.
   * En producción, el webhook de MercadoPago actualiza automáticamente el payment intent.
   *
   * Para testing local:
   * - Usar triggerMockPayment() en su lugar
   * - O configurar environment.production = false
   */
  async markAsPaid(intentId: string): Promise<void> {
    if (environment.production) {
      throw new Error(
        'markAsPaid() deprecado en producción. El webhook de MercadoPago actualiza automáticamente el payment intent.'
      );
    }

    console.warn('⚠️ markAsPaid() solo debe usarse en desarrollo');

    const workerUrl = environment.paymentsWebhookUrl;
    if (!workerUrl) {
      throw new Error('paymentsWebhookUrl no configurado');
    }
    // workerUrl already includes /webhooks/payments path
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'mock', intent_id: intentId, status: 'approved' }),
    });
    if (!response.ok) {
      throw new Error(`Webhook respondió ${response.status}`);
    }
  }

  async getStatus(intentId: string): Promise<PaymentIntent | null> {
    const { data, error } = await this.supabase
      .from('payment_intents')
      .select('*')
      .eq('id', intentId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data as PaymentIntent;
  }

  /**
   * Simula webhook de pago para testing/desarrollo
   *
   * @param bookingId - ID del booking
   * @param status - Estado del pago simulado
   *
   * ⚠️ SOLO PARA DESARROLLO/QA
   * - En producción, el webhook de MercadoPago actualiza automáticamente
   * - Para pruebas locales, asegúrate de que environment.production = false
   */
  async triggerMockPayment(bookingId: string, status: 'approved' | 'rejected'): Promise<void> {
    if (environment.production) {
      throw new Error(
        'triggerMockPayment() solo disponible en desarrollo. En producción usar MercadoPago real.'
      );
    }

    console.warn('⚠️ triggerMockPayment() - Solo para desarrollo/testing');

    const workerUrl = environment.paymentsWebhookUrl;
    if (!workerUrl) {
      throw new Error('paymentsWebhookUrl no configurado');
    }
    // workerUrl already includes /webhooks/payments path
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'mock', booking_id: bookingId, status }),
    });
    if (!response.ok) {
      throw new Error(`Webhook respondió ${response.status}`);
    }
  }

  // Create payment intent with full details
  async createPaymentIntentWithDetails(details: {
    booking_id: string;
    payment_method: string;
    amount_cents: number;
    status: string;
  }): Promise<PaymentIntent> {
    const { data, error } = await this.supabase
      .from('payment_intents')
      .insert({
        booking_id: details.booking_id,
        provider: details.payment_method === 'wallet' ? 'wallet' : 'mercadopago',
        status: details.status,
      })
      .select()
      .single();
    if (error) throw error;
    return data as PaymentIntent;
  }

  // Alias methods for booking-detail page compatibility
  async createPaymentIntent(bookingId: string, _provider: string): Promise<PaymentIntent> {
    return this.createIntent(bookingId);
  }

  async simulateWebhook(
    
    __provider: string,
    intentId: string,
    _status: 'approved' | 'rejected',
  ): Promise<void> {
    return this.markAsPaid(intentId);
  }

  /**
   * ✅ FIX P0.2: Proceso centralizado de pago para un booking
   * Reemplaza código duplicado en payment-actions.component.ts
   */
  async processPayment(
    bookingId: string,
    retryCount = 0,
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    error?: string;
  }> {
    const MAX_RETRIES = 3;

    try {
      // 1. Crear payment intent
      const intent = await this.createIntent(bookingId);

      if (!intent || !intent.id) {
        throw new Error('No se pudo crear el payment intent');
      }

      // 2. Marcar como pagado (simula webhook)
      await this.markAsPaid(intent.id);

      // 3. Verificar estado
      const status = await this.getStatus(intent.id);

      if (status?.status === 'completed') {
        return {
          success: true,
          paymentIntentId: intent.id,
        };
      }

      throw new Error('El pago no se completó correctamente');
    } catch (error: unknown) {
      console.error('Error en processPayment:', error);

      // Retry logic para errores de red
      if (retryCount < MAX_RETRIES && this.isRetryableError(error)) {
        console.log(`Reintentando pago (${retryCount + 1}/${MAX_RETRIES})...`);
        await this.delay(1000 * (retryCount + 1)); // Backoff exponencial
        return this.processPayment(bookingId, retryCount + 1);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al procesar el pago',
      };
    }
  }

  /**
   * Determina si un error es reintentable
   */
  private isRetryableError(error: unknown): boolean {
    const retryableErrors = [
      'Network error',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'Failed to fetch',
    ];

    const errorMessage =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : String(error);
    return retryableErrors.some((msg) => errorMessage.includes(msg));
  }

  /**
   * Delay helper para retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
