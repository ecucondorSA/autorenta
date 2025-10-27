import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PaymentIntent } from '../models';
import { injectSupabase } from './supabase-client.service';
import { FxService } from './fx.service';

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
      throw new Error(`Error al crear payment intent: ${error.message}`);
    }
    return data as PaymentIntent;
  }

  async markAsPaid(intentId: string): Promise<void> {
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

  async triggerMockPayment(bookingId: string, status: 'approved' | 'rejected'): Promise<void> {
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
  async createPaymentIntent(bookingId: string, provider: string): Promise<PaymentIntent> {
    return this.createIntent(bookingId);
  }

  async simulateWebhook(
    
    _provider: string,
    intentId: string,
    status: 'approved' | 'rejected',
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
        error: error.message || 'Error al procesar el pago',
      };
    }
  }

  /**
   * Determina si un error es reintentable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'Network error',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'Failed to fetch',
    ];

    const errorMessage = error.message || error.toString();
    return retryableErrors.some((msg) => errorMessage.includes(msg));
  }

  /**
   * Delay helper para retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
