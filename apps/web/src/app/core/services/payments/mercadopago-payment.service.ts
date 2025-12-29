import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { CircuitBreakerService, CircuitOpenError } from '@core/services/infrastructure/circuit-breaker.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { environment } from '../../../../environments/environment';
import { PaymentMetricsService } from './payment-metrics.service';

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
 *
 * FIX 2025-12-28: Integrated circuit breaker pattern to prevent cascading failures
 * when MercadoPago API is experiencing issues. The circuit opens after 3 consecutive
 * failures and resets after 30 seconds.
 *
 * FIX 2025-12-28: Added PaymentMetricsService integration for real-time payment
 * tracking (success/failure rates, processing times, error categorization).
 */
@Injectable({
  providedIn: 'root',
})
export class MercadoPagoPaymentService {
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly circuitBreaker = inject(CircuitBreakerService);
  private readonly logger = inject(LoggerService);
  private readonly paymentMetrics = inject(PaymentMetricsService);

  /** Circuit name for MercadoPago payment operations */
  private readonly CIRCUIT_NAME = 'mercadopago-payment';

  /**
   * Procesa un pago de booking usando un card token generado por el SDK
   *
   * @param request - Datos del pago (booking_id, card_token, issuer_id opcional, installments opcional)
   * @returns Respuesta con el resultado del pago
   * @throws CircuitOpenError if MercadoPago is experiencing issues
   */
  async processBookingPayment(
    request: ProcessBookingPaymentRequest,
  ): Promise<ProcessBookingPaymentResponse> {
    const startTime = Date.now();
    const supabase = this.supabaseService.getClient();

    // Obtener token de autenticación
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Usuario no autenticado');
    }

    // Use circuit breaker to protect against cascading failures
    try {
      const result = await this.circuitBreaker.execute(this.CIRCUIT_NAME, async () => {
        return this.executePaymentRequest(request, session.access_token);
      });

      // Track successful payment
      this.paymentMetrics.recordPayment({
        bookingId: request.booking_id,
        method: 'card',
        outcome: 'success',
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof CircuitOpenError) {
        // Track circuit open failure
        this.paymentMetrics.recordPayment({
          bookingId: request.booking_id,
          method: 'card',
          outcome: 'circuit_open',
          durationMs,
          errorCode: 'CIRCUIT_OPEN',
          errorMessage: 'Circuit breaker is open',
        });

        this.logger.warn('MercadoPago circuit is open, payment blocked', {
          booking_id: request.booking_id,
          retryAfter: error.retryAfter?.toISOString(),
        });
        throw new Error(
          'El servicio de pagos no está disponible temporalmente. Por favor, intenta nuevamente en unos segundos.'
        );
      }

      if (error instanceof PaymentBusinessError) {
        // Track rejected payment (business error)
        const errorCode = (error.paymentResponse as { code?: string }).code || 'REJECTED';
        this.paymentMetrics.recordPayment({
          bookingId: request.booking_id,
          method: 'card',
          outcome: 'rejected',
          durationMs,
          errorCode,
          errorMessage: error.message,
        });
      } else {
        // Track infrastructure error
        this.paymentMetrics.recordPayment({
          bookingId: request.booking_id,
          method: 'card',
          outcome: 'error',
          durationMs,
          errorCode: 'INFRASTRUCTURE_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      throw error;
    }
  }

  /**
   * Check if MercadoPago payment circuit is currently open
   */
  isServiceAvailable(): boolean {
    return !this.circuitBreaker.isOpen(this.CIRCUIT_NAME);
  }

  /**
   * Get circuit breaker statistics for monitoring
   */
  getCircuitStats() {
    return this.circuitBreaker.getStats(this.CIRCUIT_NAME);
  }

  /**
   * Execute the actual payment request to Edge Function
   */
  private async executePaymentRequest(
    request: ProcessBookingPaymentRequest,
    accessToken: string,
  ): Promise<ProcessBookingPaymentResponse> {
    const supabaseUrl = this.getSupabaseUrl();
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/mercadopago-process-booking-payment`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));

      // Log the failure for circuit breaker tracking
      this.logger.error('MercadoPago payment request failed', null, {
        booking_id: request.booking_id,
        status: response.status,
        error: errorData.error,
      });

      throw new Error(errorData.error || 'Error al procesar el pago');
    }

    const data: ProcessBookingPaymentResponse = await response.json();

    if (!data.success) {
      // Note: Business logic failures (rejected cards, etc.) should NOT trip the circuit
      // Only infrastructure failures should trip it. Check if this is an infrastructure error.
      const isInfrastructureError = this.isInfrastructureError(data);

      if (isInfrastructureError) {
        throw new Error(data.error || 'Error de infraestructura en el procesador de pagos');
      }

      // For business errors (rejected cards, etc.), throw but don't trip circuit
      throw new PaymentBusinessError(data.error || 'Error desconocido al procesar el pago', data);
    }

    return data;
  }

  /**
   * Determine if an error is an infrastructure error (should trip circuit)
   * vs a business error (rejected card, invalid data, etc.)
   */
  private isInfrastructureError(data: ProcessBookingPaymentResponse): boolean {
    const errorCode = (data as { code?: string }).code;

    // Infrastructure errors that should trip the circuit
    const infrastructureErrors = [
      'SERVICE_UNAVAILABLE',
      'GATEWAY_TIMEOUT',
      'RATE_LIMITER_ERROR',
      'MP_API_ERROR',
      'NETWORK_ERROR',
      'INTERNAL_ERROR',
    ];

    return infrastructureErrors.includes(errorCode || '');
  }

  /**
   * Obtiene la URL base de Supabase desde variables de entorno
   */
  private getSupabaseUrl(): string {
    return environment.supabaseUrl || '';
  }
}

/**
 * Error for business-level payment failures (rejected cards, insufficient funds, etc.)
 * These errors should NOT trip the circuit breaker.
 */
export class PaymentBusinessError extends Error {
  constructor(
    message: string,
    public readonly paymentResponse: ProcessBookingPaymentResponse
  ) {
    super(message);
    this.name = 'PaymentBusinessError';
  }
}
