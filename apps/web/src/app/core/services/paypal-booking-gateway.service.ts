import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  PaymentGateway,
  PaymentPreferenceResponse,
  PaymentProvider,
} from '../interfaces/payment-gateway.interface';
import { SupabaseClientService } from './supabase-client.service';

/**
 * PayPal Create Order Response
 * Response from paypal-create-order Edge Function
 */
interface PayPalCreateOrderResponse {
  success: boolean;
  order_id: string;
  approval_url: string;
  status: string;
  amount_usd: string;
  currency: string;
  split_enabled: boolean;
  error?: string;
}

/**
 * PayPal Capture Response
 * Response from paypal-capture-order Edge Function
 */
interface PayPalCaptureResponse {
  success: boolean;
  capture_id: string;
  order_id: string;
  status: string;
  amount: string;
  currency: string;
  booking_id: string;
  error?: string;
}

/**
 * Gateway de PayPal para Bookings (Internacional)
 *
 * Abstrae la integración con las Edge Functions de PayPal:
 * - paypal-create-order: Crea orden de pago con split payments (85/15)
 * - paypal-capture-order: Captura orden después de aprobación del usuario
 *
 * Implementa la interfaz PaymentGateway para compatibilidad multi-provider.
 *
 * Características:
 * - Split payments: 85% dueño, 15% plataforma (INSTANT disbursement)
 * - Multi-moneda: Convierte ARS → USD automáticamente
 * - PayPal Orders API v2
 * - Webhook integration para confirmación automática
 *
 * Ventajas:
 * - Separación de capas (UI no conoce infraestructura)
 * - Facilita testing (mockear el gateway)
 * - Manejo centralizado de errores
 * - Type-safety con interfaces TypeScript
 */
@Injectable({
  providedIn: 'root',
})
export class PayPalBookingGatewayService implements PaymentGateway {
  readonly provider: PaymentProvider = 'paypal';
  private readonly supabaseService = inject(SupabaseClientService);

  /**
   * Crea una orden de pago en PayPal para un booking
   *
   * @param bookingId - ID del booking
   * @param useSplitPayment - Si se debe usar split payment (85/15) - opcional
   * @returns Observable con la respuesta de PayPal
   */
  createBookingPreference(
    bookingId: string,
    useSplitPayment = false
  ): Observable<PaymentPreferenceResponse> {
    return from(this._createOrder(bookingId, useSplitPayment)).pipe(
      catchError((err) => {
        return throwError(() => new Error(this.formatError(err)));
      })
    );
  }

  /**
   * Implementación interna usando async/await
   */
  private async _createOrder(
    bookingId: string,
    useSplitPayment: boolean
  ): Promise<PaymentPreferenceResponse> {
    const supabase = this.supabaseService.getClient();

    // Obtener token de autenticación
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener URL base de Supabase
    const supabaseUrl = this.getSupabaseUrl();
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/paypal-create-order`;

    // Llamar a Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        booking_id: bookingId,
        use_split_payment: useSplitPayment,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || 'Error al crear orden de pago en PayPal');
    }

    const data: PayPalCreateOrderResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error desconocido al crear orden de PayPal');
    }

    // Convertir a formato genérico PaymentPreferenceResponse
    return {
      success: true,
      preference_id: data.order_id,
      init_point: data.approval_url,
      amount_usd: parseFloat(data.amount_usd),
      currency: data.currency,
      provider: 'paypal',
    };
  }

  /**
   * Captura una orden de PayPal después de la aprobación del usuario
   *
   * Este método debe llamarse después de que el usuario apruebe el pago en PayPal
   * y sea redirigido de vuelta a la aplicación.
   *
   * @param orderId - ID de la orden de PayPal
   * @returns Observable con la respuesta de captura
   */
  captureOrder(orderId: string): Observable<PayPalCaptureResponse> {
    return from(this._captureOrder(orderId)).pipe(
      catchError((err) => {
        return throwError(() => new Error(this.formatError(err)));
      })
    );
  }

  /**
   * Implementación interna de captura
   */
  private async _captureOrder(orderId: string): Promise<PayPalCaptureResponse> {
    const supabase = this.supabaseService.getClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Usuario no autenticado');
    }

    const supabaseUrl = this.getSupabaseUrl();
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/paypal-capture-order`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ order_id: orderId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || 'Error al capturar pago de PayPal');
    }

    const data: PayPalCaptureResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error desconocido al capturar orden de PayPal');
    }

    return data;
  }

  /**
   * Verifica si una orden de PayPal sigue válida
   *
   * @param orderId - ID de la orden de PayPal
   * @returns true si la orden existe y no ha sido capturada
   */
  async isPreferenceValid(orderId: string): Promise<boolean> {
    try {
      const supabase = this.supabaseService.getClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return false;

      // Verificar en la tabla bookings si la orden sigue activa
      const { data: booking } = await supabase
        .from('bookings')
        .select('payment_preference_id, payment_provider, status')
        .eq('payment_preference_id', orderId)
        .eq('payment_provider', 'paypal')
        .single();

      if (!booking) return false;

      // La orden es válida si el booking no ha sido confirmado aún
      return booking.status === 'pending';
    } catch (err) {
      return false;
    }
  }

  /**
   * Redirige al usuario al checkout de PayPal
   *
   * @param approvalUrl - URL de aprobación de PayPal
   * @param openInNewTab - Si true, abre en nueva pestaña (default: false)
   */
  redirectToCheckout(approvalUrl: string, openInNewTab = false): void {
    if (openInNewTab) {
      window.open(approvalUrl, '_blank');
    } else {
      window.location.href = approvalUrl;
    }
  }

  /**
   * Obtiene la URL base de Supabase desde variables de entorno
   */
  private getSupabaseUrl(): string {
    const supabase = this.supabaseService.getClient();
    // @ts-expect-error - Acceso interno al URL
    return supabase.supabaseUrl || '';
  }

  /**
   * Formatea errores para mostrar al usuario
   */
  private formatError(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Error al procesar el pago con PayPal. Por favor intente nuevamente.';
  }
}
