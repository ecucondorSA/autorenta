import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { SupabaseClient } from '@supabase/supabase-js';
import { FunctionsResponse } from '@supabase/functions-js';
import {
  PaymentAuthorization,
  AuthorizePaymentResult,
  CurrencyCode,
} from '../models/booking-detail-payment.model';
import { AuthService } from '@core/services/auth/auth.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

interface MercadoPagoPreauthResponse {
  success: boolean;
  status: 'approved' | 'authorized' | 'in_process' | 'rejected' | 'pending';
  status_detail?: string;
  error?: string;
  expires_at?: string;
}

interface MercadoPagoFunctionResponse {
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentAuthorizationService {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly authService = inject(AuthService);

  private readonly MP_ERROR_MESSAGES: Record<string, string> = {
    cc_rejected_high_risk: 'Tu pago fue rechazado por políticas de seguridad.',
    cc_rejected_insufficient_amount: 'Tu tarjeta no tiene fondos suficientes.',
    cc_rejected_bad_filled_card_number: 'Revisa el número de tu tarjeta.',
    cc_rejected_bad_filled_security_code: 'El código de seguridad (CVV) es incorrecto.',
    cc_rejected_bad_filled_date: 'La fecha de vencimiento es incorrecta.',
    cc_rejected_call_for_authorize: 'Debes autorizar este pago con tu banco.',
  };

  private getErrorMessage(statusDetail?: string): string {
    return (
      (statusDetail && this.MP_ERROR_MESSAGES[statusDetail]) ||
      'No pudimos procesar tu pago. Por favor, intenta nuevamente.'
    );
  }

  authorizePayment(params: {
    userId: string;
    amountUsd: number;
    amountArs: number;
    fxRate: number;
    cardToken: string;
    payerEmail: string;
    payerIdentification?: { type: string; number: string };
    description?: string;
    bookingId?: string;
  }): Observable<AuthorizePaymentResult> {
    return from(
      this.supabase.rpc('create_payment_authorization', {
        p_user_id: params.userId,
        p_booking_id: params.bookingId || null,
        p_amount_usd: params.amountUsd,
        p_amount_ars: params.amountArs,
        p_fx_rate: params.fxRate,
        p_description: params.description || 'Preautorización de garantía',
        p_external_reference: `preauth_${params.bookingId || Date.now()}`,
      }),
    ).pipe(
      switchMap(({ data, error }) => {
        if (error || !data?.success) {
          throw new Error(data?.error || 'Error creating payment intent');
        }
        return from(this.authService.ensureSession()).pipe(
          switchMap((session) => {
            if (!session?.access_token) throw new Error('No session token');
            // Convert camelCase to snake_case for Edge Function
            return from(
              this.supabase.functions.invoke<MercadoPagoPreauthResponse>('mp-create-preauth', {
                body: {
                  intent_id: data.intent_id,
                  user_id: params.userId,
                  booking_id: params.bookingId || null,
                  amount_ars: params.amountArs,
                  amount_usd: params.amountUsd,
                  card_token: params.cardToken,
                  payer_email: params.payerEmail,
                  payer_identification_type: params.payerIdentification?.type || null,
                  payer_identification_number: params.payerIdentification?.number || null,
                  description: params.description,
                  external_reference: `preauth_${params.bookingId || Date.now()}`,
                },
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }),
            );
          }),
          map((mpResponse: FunctionsResponse<MercadoPagoPreauthResponse>) => {
            const responseData = mpResponse.data;
            if (!responseData) {
              throw new Error('Authorization failed');
            }
            if (responseData.status === 'rejected') {
              throw new Error(this.getErrorMessage(responseData.status_detail));
            }
            if (!responseData.success) {
              throw new Error(responseData.error || 'Authorization failed');
            }
            return {
              ok: true,
              authorizedPaymentId: data.intent_id,
              expiresAt: responseData.expires_at ? new Date(responseData.expires_at) : undefined,
            };
          }),
        );
      }),
      catchError((error) => of({ ok: false, error: error.message || 'Error desconocido' })),
    );
  }

  getAuthorizationStatus(authorizedPaymentId: string): Observable<PaymentAuthorization | null> {
    return from(
      this.supabase.from('payment_intents').select('*').eq('id', authorizedPaymentId).single(),
    ).pipe(
      map(({ data, error }) => {
        if (error || !data) return null;
        return {
          authorizedPaymentId: data.id,
          amountArs: data.amount_ars,
          amountUsd: data.amount_usd,
          currency: 'ARS' as CurrencyCode,
          expiresAt: data.preauth_expires_at ? new Date(data.preauth_expires_at) : new Date(),
          status: this.mapStatus(data.status),
          paymentMethodId: data.payment_method_id,
          cardLast4: data.card_last4,
          createdAt: new Date(data.created_at),
        };
      }),
      catchError(() => of(null)),
    );
  }

  captureAuthorization(
    authorizedPaymentId: string,
    amountArs?: number,
  ): Observable<{ ok: boolean; error?: string }> {
    return this.invokeFunction('mp-capture-preauth', {
      intent_id: authorizedPaymentId,
      amount_ars: amountArs,
    });
  }

  cancelAuthorization(authorizedPaymentId: string): Observable<{ ok: boolean; error?: string }> {
    return this.invokeFunction('mp-cancel-preauth', { intent_id: authorizedPaymentId });
  }

  private invokeFunction<TBody extends Record<string, unknown>>(
    functionName: string,
    body: TBody,
  ): Observable<{ ok: boolean; error?: string }> {
    return from(this.authService.ensureSession()).pipe(
      switchMap((session) => {
        if (!session?.access_token) throw new Error('No session token');
        return from(
          this.supabase.functions.invoke<MercadoPagoFunctionResponse>(functionName, {
            body,
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        );
      }),
      map((response: FunctionsResponse<MercadoPagoFunctionResponse>) => {
        if (!response.data?.success) {
          throw new Error(response.data?.error || 'Function call failed');
        }
        return { ok: true };
      }),
      catchError((error) => of({ ok: false, error: error.message || 'Error desconocido' })),
    );
  }

  private mapStatus(dbStatus: string): 'pending' | 'authorized' | 'expired' | 'failed' {
    switch (dbStatus) {
      case 'authorized':
      case 'approved': // DB stores 'approved' for preauthorized payments
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
