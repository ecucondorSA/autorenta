import { Injectable, inject } from '@angular/core';
import { environment } from '@environment';
import { PaymentIntent } from '@core/models';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { FxService } from '@core/services/payments/fx.service';

/**
 * Type guard for PaymentIntent
 * Validates that RPC response has required fields
 */
function isPaymentIntent(data: unknown): data is PaymentIntent {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['provider'] === 'string' &&
    typeof obj['status'] === 'string' &&
    typeof obj['created_at'] === 'string'
  );
}

/**
 * Safely casts RPC response to PaymentIntent with runtime validation
 * @throws Error if data doesn't match PaymentIntent structure
 */
function assertPaymentIntent(data: unknown, context: string): PaymentIntent {
  if (!isPaymentIntent(data)) {
    console.error(`[PaymentsService] Invalid PaymentIntent in ${context}:`, data);
    throw new Error(`Invalid PaymentIntent response from ${context}`);
  }
  return data;
}

/**
 * PaymentsService
 * ... (Comments preserved) ...
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

    return this.createPaymentIntent({
      bookingId: bookingId,
      userId: booking.renter_id,
      amount: Number(booking.total_amount ?? 0),
      currency: booking.currency ?? 'USD',
      intentType: 'booking',
      description: `Pago de reserva ${bookingId.substring(0, 8)}`,
    });
  }

  async createPaymentIntent(
    params:
      | {
          bookingId?: string;
          userId?: string;
          amount: number;
          currency: string;
          intentType: 'booking' | 'security_deposit' | 'fine';
          isPreAuth?: boolean;
          description?: string;
        }
      | string,
    _provider?: string,
  ): Promise<PaymentIntent> {
    // Overload handler: if string, it's the old signature (bookingId, provider)
    if (typeof params === 'string') {
      return this.createIntent(params);
    }

    // Normal generic implementation
    const totalAmount = Number(params.amount ?? 0);
    const currency = (params.currency ?? 'USD').toUpperCase();

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error(`Monto inválido para el intent`);
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
        booking_id: params.bookingId,
        user_id: params.userId,
        intent_type: params.intentType,
        amount_usd: amountUsd,
        amount_ars: amountArs,
        fx_rate: fxRate,
        status: 'pending',
        description: params.description || `Intent ${params.intentType}`,
        is_preauth: params.isPreAuth || false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `Error al crear payment intent: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
    return data as PaymentIntent;
  }

  // ... (Other methods: createMpPreAuthOrder, markAsPaid, getStatus, triggerMockPayment, capture, release, cancel) ...

  async createMpPreAuthOrder(
    intentId: string,
    amountCents: number,
    description: string,
    bookingId?: string,
  ): Promise<PaymentIntent> {
    // (Implementation preserved from previous read)
    const { data, error } = await this.supabase.rpc('create_mp_preauth_order', {
      p_intent_id: intentId,
      p_amount_cents: amountCents,
      p_description: description,
      p_booking_id: bookingId,
    });
    if (error) throw new Error(error.message);
    return assertPaymentIntent(data, 'create_mp_preauth_order');
  }

  async markAsPaid(intentId: string): Promise<void> {
    if (environment.production) throw new Error('Not allowed in prod');
    const workerUrl = environment.paymentsWebhookUrl;
    await fetch(workerUrl, {
      method: 'POST',
      body: JSON.stringify({ provider: 'mock', intent_id: intentId, status: 'approved' }),
    });
  }

  async getStatus(intentId: string): Promise<PaymentIntent | null> {
    const { data } = await this.supabase
      .from('payment_intents')
      .select('*')
      .eq('id', intentId)
      .single();
    return data as PaymentIntent;
  }

  async triggerMockPayment(bookingId: string, status: 'approved' | 'rejected'): Promise<void> {
    if (environment.production) throw new Error('Not allowed in prod');
    const workerUrl = environment.paymentsWebhookUrl;
    await fetch(workerUrl, {
      method: 'POST',
      body: JSON.stringify({ provider: 'mock', booking_id: bookingId, status }),
    });
  }

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

  async simulateWebhook(
    __provider: string,
    intentId: string,
    _status: 'approved' | 'rejected',
  ): Promise<void> {
    return this.markAsPaid(intentId);
  }

  async captureMpPreAuth(
    mpOrderId: string,
    amountCents: number,
    description: string,
  ): Promise<PaymentIntent> {
    const { data, error } = await this.supabase.rpc('capture_mp_preauth_order', {
      p_mp_order_id: mpOrderId,
      p_amount_cents: amountCents,
      p_description: description,
    });
    if (error) throw new Error(error.message);
    return assertPaymentIntent(data, 'capture_mp_preauth_order');
  }

  async releaseMpPreAuth(mpOrderId: string, description: string): Promise<PaymentIntent> {
    const { data, error } = await this.supabase.rpc('release_mp_preauth_order', {
      p_mp_order_id: mpOrderId,
      p_description: description,
    });
    if (error) throw new Error(error.message);
    return assertPaymentIntent(data, 'release_mp_preauth_order');
  }

  async cancelMpPreAuth(mpOrderId: string, description: string): Promise<PaymentIntent> {
    return this.releaseMpPreAuth(mpOrderId, description);
  }

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
      const intent = await this.createIntent(bookingId);

      if (!intent || !intent.id) {
        throw new Error('No se pudo crear el payment intent');
      }

      if (!environment.production) {
        await this.markAsPaid(intent.id);
      }

      const status = await this.getStatus(intent.id);

      if (status?.status === 'completed' || status?.status === 'approved') {
        return {
          success: true,
          paymentIntentId: intent.id,
        };
      }

      throw new Error('El pago no se completó correctamente');
    } catch (error: unknown) {
      if (retryCount < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.processPayment(bookingId, retryCount + 1);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado',
      };
    }
  }
}
