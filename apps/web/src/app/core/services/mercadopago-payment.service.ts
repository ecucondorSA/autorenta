import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

export interface ProcessBookingPaymentRequest {
  booking_id: string;
  card_token: string;
  issuer_id?: string;
  installments?: number;
}

export interface ProcessBookingPaymentResponse {
  success: boolean;
  payment_id?: number;
  status?: string;
  status_detail?: string;
  booking_id?: string;
  booking_status?: string;
  error?: string;
  details?: unknown;
}

/**
 * Servicio para procesar pagos de bookings con MercadoPago usando SDK Frontend
 *
 * Este servicio reemplaza el flujo de Checkout Pro (redirección) con SDK completo,
 * permitiendo procesar pagos directamente desde el frontend usando card tokens.
 */
@Injectable({
  providedIn: 'root',
})
export class MercadoPagoPaymentService {
  private readonly supabaseService = inject(SupabaseClientService);

  /**
   * Procesa un pago de booking usando un card token generado por el SDK
   *
   * @param request - Datos del pago (booking_id, card_token, issuer_id opcional, installments opcional)
   * @returns Respuesta con el resultado del pago
   */
  async processBookingPayment(
    request: ProcessBookingPaymentRequest,
  ): Promise<ProcessBookingPaymentResponse> {
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
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/mercadopago-process-booking-payment`;

    // Llamar a Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.error || 'Error al procesar el pago');
    }

    const data: ProcessBookingPaymentResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Error desconocido al procesar el pago');
    }

    return data;
  }

  /**
   * Obtiene la URL base de Supabase desde variables de entorno
   */
  private getSupabaseUrl(): string {
    const supabase = this.supabaseService.getClient();
    // @ts-expect-error - Acceso interno al URL
    return supabase.supabaseUrl || '';
  }
}




