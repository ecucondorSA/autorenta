import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { environment } from '@environment';
import {
  PaymentAuthorization,
  AuthorizePaymentResult,
} from '../models/booking-detail-payment.model';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';

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
   * MercadoPago TEST sandbox limita montos a ~$100,000 ARS
   * Rechaza montos mayores con cc_rejected_high_risk
   */
  private readonly MP_TEST_MAX_AMOUNT_ARS = 10000;

  /**
   * Mensajes de error en español para códigos de rechazo de MercadoPago
   * @see https://www.mercadopago.com.ar/developers/es/docs/checkout-api/response-handling/collection-results
   */
  private readonly MP_ERROR_MESSAGES: Record<string, string> = {
    // Rechazos por la tarjeta
    cc_rejected_high_risk:
      'Tu pago fue rechazado por políticas de seguridad. Intenta con otra tarjeta o contacta a tu banco.',
    cc_rejected_insufficient_amount:
      'Tu tarjeta no tiene fondos suficientes. Intenta con otra tarjeta.',
    cc_rejected_bad_filled_card_number: 'Revisa el número de tu tarjeta e intenta nuevamente.',
    cc_rejected_bad_filled_security_code:
      'El código de seguridad (CVV) es incorrecto. Verifica e intenta nuevamente.',
    cc_rejected_bad_filled_date:
      'La fecha de vencimiento es incorrecta. Verifica e intenta nuevamente.',
    cc_rejected_bad_filled_other: 'Revisa los datos de tu tarjeta e intenta nuevamente.',
    cc_rejected_call_for_authorize:
      'Debes autorizar este pago con tu banco. Contacta a tu entidad bancaria.',
    cc_rejected_card_disabled:
      'Tu tarjeta está deshabilitada. Contacta a tu banco o intenta con otra tarjeta.',
    cc_rejected_duplicated_payment: 'Ya realizaste un pago similar recientemente.',
    cc_rejected_invalid_installments:
      'El plan de cuotas seleccionado no está disponible para esta tarjeta.',
    cc_rejected_max_attempts: 'Alcanzaste el límite de intentos. Intenta con otra tarjeta.',
    cc_rejected_blacklist: 'No pudimos procesar tu pago. Intenta con otra tarjeta.',
    cc_rejected_card_error:
      'No pudimos procesar tu tarjeta. Intenta nuevamente o usa otra tarjeta.',

    // Errores del comercio
    cc_amount_rate_limit_exceeded: 'Excediste el límite de monto. Intenta con un monto menor.',

    // Errores de fraude
    cc_rejected_fraud: 'Tu pago fue rechazado por razones de seguridad.',

    // Otros
    rejected_other_reason: 'Tu pago fue rechazado. Intenta nuevamente o contacta a tu banco.',
  };

  /**
   * Obtiene un mensaje de error amigable para el usuario
   */
  private getErrorMessage(statusDetail?: string): string {
    if (!statusDetail) {
      return 'No pudimos procesar tu pago. Por favor, intenta nuevamente.';
    }

    return (
      this.MP_ERROR_MESSAGES[statusDetail] ||
      `Tu pago fue rechazado (${statusDetail}). Intenta con otra tarjeta o contacta a tu banco.`
    );
  }

  /**
   * Ajusta el monto para testing si excede el límite del sandbox
   */
  private getTestSafeAmount(amountArs: number): number {
    if (!environment.production && amountArs > this.MP_TEST_MAX_AMOUNT_ARS) {
        `💡 [TEST MODE] Monto reducido de $${amountArs} ARS a $${this.MP_TEST_MAX_AMOUNT_ARS} ARS para evitar rechazo por alto riesgo en sandbox`,
      );
      return this.MP_TEST_MAX_AMOUNT_ARS;
    }
    return amountArs;
  }

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

    // Ajustar monto para TEST mode si es necesario
    const safeAmountArs = this.getTestSafeAmount(amountArs);
    const safeAmountUsd = safeAmountArs !== amountArs ? safeAmountArs / fxRate : amountUsd;

      amountUsd: safeAmountUsd,
      amountArs: safeAmountArs,
      bookingId,
      ...(safeAmountArs !== amountArs && {
        originalAmountArs: amountArs,
        testMode: true,
      }),
    });

    return from(
      (async () => {
        // 1. Crear payment intent en DB
        const { data: intent, error: intentError } = await this.supabaseClient.rpc(
          'create_payment_authorization',
          {
            p_user_id: userId,
            p_booking_id: bookingId || null,
            p_amount_usd: safeAmountUsd,
            p_amount_ars: safeAmountArs,
            p_fx_rate: fxRate,
            p_description: description,
            p_external_reference: `preauth_${bookingId || Date.now()}`,
          },
        );

        if (intentError || !intent?.success) {
          throw new Error(intent?.error || 'Error creating payment intent');
        }

        const intentId = intent.intent_id;

        // 2. Obtener session token
        const session = await this.authService.ensureSession();
        if (!session?.access_token) {
          throw new Error('No session token');
        }

        // 3. Llamar Edge Function para crear preauth en MP
        const supabaseUrl = environment.supabaseUrl;
        if (!supabaseUrl) {
          throw new Error(
            'Supabase URL no configurada. Define NG_APP_SUPABASE_URL en tu entorno antes de autorizar pagos.',
          );
        }
        const mpResponse = await fetch(`${supabaseUrl}/functions/v1/mp-create-preauth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            intent_id: intentId,
            user_id: userId,
            booking_id: bookingId,
            amount_ars: safeAmountArs,
            amount_usd: safeAmountUsd,
            card_token: cardToken,
            payer_email: payerEmail,
            description: description,
            external_reference: intent.external_reference,
          }),
        });

        if (!mpResponse.ok) {
          const errorData = await mpResponse.json();
          throw new Error(errorData.error || 'Error al autorizar el pago');
        }

        const mpData = await mpResponse.json();

        // Verificar si fue rechazado
        if (mpData.status === 'rejected') {
          const errorMsg = this.getErrorMessage(mpData.status_detail);
            status_detail: mpData.status_detail,
            mp_payment_id: mpData.mp_payment_id,
          });
          throw new Error(errorMsg);
        }

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
      })(),
    ).pipe(
      catchError((error) => {
        return of({
          ok: false,
          error: error.message || 'Error desconocido al autorizar',
        });
      }),
    );
  }

  /**
   * Obtiene el estado actual de una autorización de pago
   */
  getAuthorizationStatus(authorizedPaymentId: string): Observable<PaymentAuthorization | null> {
    return from(
      this.supabaseClient
        .from('payment_intents')
        .select('*')
        .eq('id', authorizedPaymentId)
        .single(),
    ).pipe(
      map((response) => {
        if (response.error || !response.data) {
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
        return of(null);
      }),
    );
  }

  /**
   * Captura una preautorización (cobra los fondos retenidos)
   * Llama al Edge Function mp-capture-preauth
   */
  captureAuthorization(
    authorizedPaymentId: string,
    amountArs?: number,
  ): Observable<{ ok: boolean; error?: string }> {

    return from(
      (async () => {
        // Obtener session token
        const session = await this.authService.ensureSession();
        if (!session?.access_token) {
          throw new Error('No session token');
        }

        // Llamar Edge Function para capturar preauth
        const supabaseUrl = environment.supabaseUrl;
        if (!supabaseUrl) {
          throw new Error(
            'Supabase URL no configurada. Define NG_APP_SUPABASE_URL en tu entorno antes de crear preautorizaciones.',
          );
        }
        const response = await fetch(`${supabaseUrl}/functions/v1/mp-capture-preauth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            intent_id: authorizedPaymentId,
            ...(amountArs ? { amount_ars: amountArs } : {}),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al capturar preautorización');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Capture failed');
        }

        return { ok: true };
      })(),
    ).pipe(
      catchError((error) => {
        return of({
          ok: false,
          error: error.message || 'Error desconocido al capturar',
        });
      }),
    );
  }

  /**
   * Cancela una preautorización (libera los fondos)
   * Llama al Edge Function mp-cancel-preauth
   */
  cancelAuthorization(authorizedPaymentId: string): Observable<{ ok: boolean; error?: string }> {

    return from(
      (async () => {
        // Obtener session token
        const session = await this.authService.ensureSession();
        if (!session?.access_token) {
          throw new Error('No session token');
        }

        // Llamar Edge Function para cancelar preauth
        const supabaseUrl = environment.supabaseUrl;
        if (!supabaseUrl) {
          throw new Error(
            'Supabase URL no configurada. Define NG_APP_SUPABASE_URL en tu entorno antes de cancelar preautorizaciones.',
          );
        }
        const response = await fetch(`${supabaseUrl}/functions/v1/mp-cancel-preauth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            intent_id: authorizedPaymentId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cancelar preautorización');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Cancellation failed');
        }

        return { ok: true };
      })(),
    ).pipe(
      catchError((error) => {
        return of({
          ok: false,
          error: error.message || 'Error desconocido al cancelar',
        });
      }),
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
  private mapStatus(dbStatus: string): 'pending' | 'authorized' | 'expired' | 'failed' {
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
