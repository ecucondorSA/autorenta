import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PaymentPreferenceResponse, PaymentGateway } from '@core/interfaces/payment-gateway.interface';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { environment } from '../../../../environments/environment';

/**
 * Respuesta de creación de preferencia de MercadoPago
 */
export interface MercadoPagoPreferenceResponse extends PaymentPreferenceResponse {
  amount_ars: number;
  amount_usd: number;
  exchange_rate: number;
}

/**
 * Gateway de MercadoPago para Bookings (Argentina)
 *
 * Abstrae la integración con la Edge Function `mercadopago-create-booking-preference`.
 * Elimina la necesidad de que los componentes hagan `fetch` directo y conozcan
 * las URLs de Supabase.
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
export class MercadoPagoBookingGatewayService implements PaymentGateway {
  readonly provider = 'mercadopago' as const;
  private readonly supabaseService = inject(SupabaseClientService);

  /**
   * Crea una preferencia de pago en MercadoPago para un booking
   *
   * @param bookingId - ID del booking
   * @param useSplitPayment - Whether to use marketplace split payments (optional)
   * @returns Observable con la respuesta de MercadoPago
   */
  createBookingPreference(
    bookingId: string,
    useSplitPayment?: boolean,
  ): Observable<MercadoPagoPreferenceResponse> {
    return from(this._createPreference(bookingId, useSplitPayment)).pipe(
      catchError((err) => {
        return throwError(() => new Error(this.formatError(err)));
      }),
    );
  }

  /**
   * Implementación interna usando async/await
   */
  private async _createPreference(
    bookingId: string,
    _useSplitPayment?: boolean,
  ): Promise<MercadoPagoPreferenceResponse> {
    const supabase = this.supabaseService.getClient();

    // Obtener token de autenticación
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener URL base de Supabase desde configuración
    const supabaseUrl = this.getSupabaseUrl();
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/mercadopago-create-booking-preference`;

    // Llamar a Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ booking_id: bookingId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || 'Error al crear preferencia de pago');
    }

    const data: MercadoPagoPreferenceResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error desconocido al crear preferencia');
    }

    return data;
  }

  /**
   * Obtiene la URL base de Supabase desde variables de entorno
   */
  private getSupabaseUrl(): string {
    return environment.supabaseUrl || '';
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

    return 'Error al procesar el pago. Por favor intente nuevamente.';
  }

  /**
   * Verifica si una preferencia de MercadoPago sigue válida
   *
   * @param preferenceId - ID de la preferencia
   * @returns true si la preferencia existe y no ha expirado
   */
  async isPreferenceValid(preferenceId: string): Promise<boolean> {
    try {
      const supabase = this.supabaseService.getClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return false;

      // Verificar en la tabla bookings si la preferencia sigue activa
      const { data: booking } = await supabase
        .from('bookings')
        .select('mercadopago_preference_id, status')
        .eq('mercadopago_preference_id', preferenceId)
        .single();

      if (!booking) return false;

      // La preferencia es válida si el booking no ha sido pagado aún
      return booking.status === 'pending';
    } catch {
      return false;
    }
  }

  /**
   * Redirige al usuario al checkout de MercadoPago
   *
   * @param initPoint - URL de checkout de MercadoPago
   * @param openInNewTab - Si true, abre en nueva pestaña (default: false)
   */
  redirectToCheckout(initPoint: string, openInNewTab = false): void {
    if (openInNewTab) {
      window.open(initPoint, '_blank');
    } else {
      window.location.href = initPoint;
    }
  }
}
