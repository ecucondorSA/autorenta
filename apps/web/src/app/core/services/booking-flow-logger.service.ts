import { Injectable, inject } from '@angular/core';
import type { BookingStatus } from '../models';
import { LoggerService } from './logger.service';

/**
 * BookingFlowLoggerService
 *
 * Servicio especializado para logging del flujo de booking.
 * Centraliza el logging para facilitar debugging y monitoreo.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingFlowLoggerService {
  private readonly logger = inject(LoggerService);
  // import.meta.env may not have type definitions in this TS config used by the Angular
  // template/type checker plugin. Cast to unknown to avoid "Property 'env' does not exist on type 'ImportMeta'".
  private readonly isDevelopment = !(import.meta as unknown as { env?: { PROD?: boolean } }).env
    ?.PROD;

  /**
   * Log de transición de estado
   */
  logStatusTransition(
    bookingId: string,
    from: BookingStatus,
    to: BookingStatus,
    userId: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.isDevelopment) return;

    console.group(`🔄 Booking Status Transition: ${bookingId}`);
    this.logger.debug('From:', from);
    this.logger.debug('To:', to);
    this.logger.debug('User:', userId);
    if (metadata) {
      this.logger.debug('Metadata:', metadata);
    }
    console.groupEnd();
  }

  /**
   * Log de acción realizada
   */
  logAction(
    bookingId: string,
    action: string,
    userId: string,
    success: boolean,
    error?: string,
  ): void {
    if (!this.isDevelopment) return;

    const emoji = success ? '✅' : '❌';
    this.logger.debug(`${emoji} Booking Action: ${action}`, {
      bookingId,
      userId,
      success,
      error,
    });
  }

  /**
   * Log de validación
   */
  logValidation(bookingId: string, validation: string, passed: boolean, reason?: string): void {
    if (!this.isDevelopment) return;

    const emoji = passed ? '✅' : '⚠️';
    this.logger.debug(`${emoji} Validation: ${validation}`, {
      bookingId,
      passed,
      reason,
    });
  }

  /**
   * Log de error en el flujo
   */
  logError(
    bookingId: string,
    context: string,
    error: Error | unknown,
    metadata?: Record<string, unknown>,
  ): void {
    console.error(`❌ Booking Flow Error [${context}]:`, {
      bookingId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      metadata,
    });
  }

  /**
   * Log de métricas de performance
   */
  logPerformance(
    bookingId: string,
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.isDevelopment) return;

    this.logger.debug(`⏱️ Performance [${operation}]:`, {
      bookingId,
      duration: `${duration}ms`,
      metadata,
    });
  }
}
