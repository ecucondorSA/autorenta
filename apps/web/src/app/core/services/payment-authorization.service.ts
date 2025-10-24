import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';
import {
  PaymentAuthorization,
  AuthorizePaymentResult,
} from '../models/booking-detail-payment.model';

/**
 * Servicio para gestionar preautorizaciones de pago con Mercado Pago
 * Integra con payment_intents y Edge Function mp-create-preauth
 */
@Injectable({
  providedIn: 'root',
})
export class PaymentAuthorizationService {
  private supabaseClient = inject(SupabaseClientService).getClient();
  private authService = inject(AuthService);

  /**
   * Crea una preautorización (hold) con Mercado Pago
   * capture=false para no capturar fondos inmediatamente
   */
  authorizePayment(params: {
    userId: string;
    amountUsd: number;
    amountArs: number;
    fxRate: number;
    cardToken: string;
    payerEmail: string;
    description?: string;
    bookingId?: string;
  }): Observable<AuthorizePaymentResult> {
    const {
      userId,
      amountUsd,
      amountArs,
      fxRate,
      cardToken,
      payerEmail,
      description = 'Preautorización de garantía',
      bookingId,
    } = params;

    console.log('💳 Creating payment authorization...', {
      amountUsd,
      amountArs,
      bookingId,
    });

    return from(
      (async () => {
        // 1. Crear payment intent en DB
        const { data: intent, error: intentError } = await this.supabaseClient
          .rpc('create_payment_authorization', {
            p_user_id: userId,
            p_booking_id: bookingId || null,
            p_amount_usd: amountUsd,
            p_amount_ars: amountArs,
            p_fx_rate: fxRate,
            p_description: description,
            p_external_reference: `preauth_${bookingId || Date.now()}`,
          });

        if (intentError || !intent?.success) {
          console.error('Error creating payment intent:', intentError);
          throw new Error(intent?.error || 'Error creating payment intent');
        }

        const intentId = intent.intent_id;
        console.log('✅ Payment intent created:', intentId);

        // 2. Obtener session token
        const session = await this.authService.ensureSession();
        if (!session?.access_token) {
          throw new Error('No session token');
        }

        // 3. Llamar Edge Function para crear preauth en MP
        const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
        const mpResponse = await fetch(
          `${supabaseUrl}/functions/v1/mp-create-preauth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              intent_id: intentId,
              user_id: userId,
              booking_id: bookingId,
              amount_ars: amountArs,
              amount_usd: amountUsd,
              card_token: cardToken,
              payer_email: payerEmail,
              description: description,
              external_reference: intent.external_reference,
            }),
          }
        );

        if (!mpResponse.ok) {
          const errorData = await mpResponse.json();
          console.error('MP API error:', errorData);
          throw new Error(errorData.error || 'Error al autorizar el pago');
        }

        const mpData = await mpResponse.json();
        console.log('✅ Mercado Pago authorization:', mpData);

        if (!mpData.success) {
          throw new Error(mpData.error || 'Authorization failed');
        }

        // 4. Mapear respuesta
        const result: AuthorizePaymentResult = {
          ok: true,
          authorizedPaymentId: intentId,
          expiresAt: mpData.expires_at ? new Date(mpData.expires_at) : undefined,
        };

        return result;
      })()
    ).pipe(
      catchError((error) => {
        console.error('❌ Error in authorizePayment:', error);
        return of({
          ok: false,
          error: error.message || 'Error desconocido al autorizar',
        });
      })
    );
  }

  /**
   * Obtiene el estado actual de una autorización de pago
   */
  getAuthorizationStatus(
    authorizedPaymentId: string
  ): Observable<PaymentAuthorization | null> {
    return from(
      this.supabaseClient
        .from('payment_intents')
        .select('*')
        .eq('id', authorizedPaymentId)
        .single()
    ).pipe(
      map((response) => {
        if (response.error || !response.data) {
          console.error('Error fetching authorization:', response.error);
          return null;
        }

        const data = response.data;

        const auth: PaymentAuthorization = {
          authorizedPaymentId: data.id,
          amountArs: data.amount_ars,
          amountUsd: data.amount_usd,
          currency: 'ARS',
          expiresAt: data.preauth_expires_at ? new Date(data.preauth_expires_at) : new Date(),
          status: this.mapStatus(data.status),
          paymentMethodId: data.payment_method_id,
          cardLast4: data.card_last4,
          createdAt: new Date(data.created_at),
        };

        return auth;
      }),
      catchError((error) => {
        console.error('Error in getAuthorizationStatus:', error);
        return of(null);
      })
    );
  }

  /**
   * Cancela una preautorización (libera los fondos)
   */
  cancelAuthorization(authorizedPaymentId: string): Observable<{ ok: boolean; error?: string }> {
    // TODO: Implementar cancelación vía MP API
    // Por ahora solo actualiza estado en DB
    return from(
      this.supabaseClient
        .from('payment_intents')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', authorizedPaymentId)
    ).pipe(
      map((response) => {
        if (response.error) {
          console.error('Error cancelling authorization:', response.error);
          return { ok: false, error: response.error.message };
        }
        return { ok: true };
      }),
      catchError((error) => {
        console.error('Error in cancelAuthorization:', error);
        return of({ ok: false, error: error.message });
      })
    );
  }

  /**
   * Verifica si una autorización ha expirado
   */
  isAuthorizationExpired(authorization: PaymentAuthorization): boolean {
    if (!authorization.expiresAt) return false;
    return new Date() > authorization.expiresAt;
  }

  /**
   * Mapea estado de DB a estado de modelo
   */
  private mapStatus(
    dbStatus: string
  ): 'pending' | 'authorized' | 'expired' | 'failed' {
    switch (dbStatus) {
      case 'authorized':
        return 'authorized';
      case 'expired':
        return 'expired';
      case 'failed':
      case 'rejected':
      case 'cancelled':
      case 'captured':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
