import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PaymentIntent } from '../models';
import { injectSupabase } from './supabase-client.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private readonly supabase = injectSupabase();

  async createIntent(bookingId: string): Promise<PaymentIntent> {
    const { data, error } = await this.supabase
      .from('payment_intents')
      .insert({ booking_id: bookingId, provider: 'mock', status: 'requires_payment' })
      .select()
      .single();
    if (error) throw error;
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

  async simulateWebhook(provider: string, intentId: string, status: 'approved' | 'rejected'): Promise<void> {
    return this.markAsPaid(intentId);
  }
}
