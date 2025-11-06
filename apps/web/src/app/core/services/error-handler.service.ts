import { Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';
import { ToastService } from './toast.service';

/**
 * ErrorHandlerService: Centralized error handling
 *
 * Provides unified error handling across the application:
 * - Logs errors with appropriate severity
 * - Shows user-friendly messages via ToastService
 * - Categorizes errors for better tracking
 * - Handles critical errors with higher priority
 *
 * Usage:
 * ```typescript
 * constructor(private errorHandler: ErrorHandlerService) {}
 *
 * try {
 *   await this.someOperation();
 * } catch (error) {
 *   this.errorHandler.handleError(error, 'Operation failed', true);
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private readonly logger = inject(LoggerService);
  private readonly toast = inject(ToastService);

  /**
   * Handle an error with optional user notification
   *
   * @param error - The error to handle (can be Error, string, or unknown)
   * @param context - Context where the error occurred (e.g., 'Loading cars', 'Processing payment')
   * @param showToUser - Whether to show a toast notification to the user (default: true)
   * @param severity - Error severity level (default: 'error')
   */
  handleError(
    error: unknown,
    context: string,
    showToUser = true,
    severity: 'error' | 'warning' | 'critical' = 'error',
  ): void {
    // 1. Log error with appropriate severity
    this.logError(error, context, severity);

    // 2. Show user-friendly message if requested
    if (showToUser) {
      const userMessage = this.getUserFriendlyMessage(error, context);
      this.showToast(userMessage, severity);
    }

    // 3. Handle critical errors specially
    if (severity === 'critical' && error instanceof Error) {
      this.logger.critical(`Critical error in ${context}`, error);
    }
  }

  /**
   * Handle network errors specifically
   */
  handleNetworkError(context: string, showToUser = true): void {
    const error = new Error('Network request failed');
    this.handleError(error, context, showToUser, 'error');
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error: unknown, context = 'Authentication', showToUser = true): void {
    this.handleError(error, context, showToUser, 'error');
  }

  /**
   * Handle validation errors (usually don't need logging)
   */
  handleValidationError(message: string, showToUser = true): void {
    if (showToUser) {
      this.toast.warning(message);
    }
    // Validation errors are usually expected, so we don't log them
  }

  /**
   * Handle payment errors with special handling
   */
  handlePaymentError(error: unknown, context = 'Payment processing', showToUser = true): void {
    // Payment errors are critical
    this.handleError(error, context, showToUser, 'critical');
  }

  /**
   * Handle booking errors
   */
  handleBookingError(error: unknown, context = 'Booking', showToUser = true): void {
    this.handleError(error, context, showToUser, 'error');
  }

  /**
   * Log error with appropriate severity
   * @private
   */
  private logError(error: unknown, context: string, severity: 'error' | 'warning' | 'critical'): void {
    const message = `Error in ${context}`;

    switch (severity) {
      case 'critical':
        if (error instanceof Error) {
          this.logger.critical(message, error);
        } else {
          this.logger.critical(message, new Error(String(error)));
        }
        break;
      case 'warning':
        this.logger.warn(message, error);
        break;
      case 'error':
      default:
        this.logger.error(message, error);
        break;
    }
  }

  /**
   * Get user-friendly error message
   * Maps technical errors to friendly messages
   * @private
   */
  private getUserFriendlyMessage(error: unknown, context: string): string {
    // If it's already a user-friendly string, return it
    if (typeof error === 'string') {
      return error;
    }

    // Extract error message if it's an Error object
    let errorMessage = '';
    if (error instanceof Error) {
      errorMessage = error.message.toLowerCase();
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message).toLowerCase();
    }

    // Map common error patterns to user-friendly messages
    const errorMappings: Array<{ pattern: RegExp; message: string }> = [
      // Network errors
      { pattern: /network|fetch|connection|timeout|failed to fetch/i, message: 'Error de conexión. Verifica tu internet e intenta nuevamente.' },
      { pattern: /networkerror|network error/i, message: 'Sin conexión a internet. Verifica tu conexión.' },
      
      // Authentication errors
      { pattern: /unauthorized|401|invalid.*token|expired.*token/i, message: 'Tu sesión expiró. Por favor inicia sesión nuevamente.' },
      { pattern: /forbidden|403|permission|access denied/i, message: 'No tienes permisos para realizar esta acción.' },
      
      // Not found errors
      { pattern: /not found|404/i, message: 'No se encontró el recurso solicitado.' },
      
      // Server errors
      { pattern: /500|internal server error|server error/i, message: 'Error del servidor. Nuestro equipo ha sido notificado.' },
      { pattern: /503|service unavailable/i, message: 'El servicio no está disponible temporalmente. Intenta en unos minutos.' },
      
      // Validation errors
      { pattern: /validation|invalid|required|missing/i, message: 'Datos inválidos. Verifica la información ingresada.' },
      
      // Payment errors
      { pattern: /payment|payment.*failed|insufficient.*funds/i, message: 'Error al procesar el pago. Verifica tu método de pago e intenta nuevamente.' },
      { pattern: /card.*declined|card.*invalid/i, message: 'Tu tarjeta fue rechazada. Verifica los datos o usa otro método de pago.' },
      
      // Booking errors
      { pattern: /booking.*unavailable|car.*unavailable|not.*available/i, message: 'El auto no está disponible para esas fechas. Por favor elige otras fechas.' },
      { pattern: /booking.*exists|already.*booked/i, message: 'Ya existe una reserva para este auto en esas fechas.' },
      
      // Supabase errors
      { pattern: /row.*security|rls|policy/i, message: 'No tienes permisos para realizar esta acción.' },
      { pattern: /duplicate.*key|unique.*constraint/i, message: 'Este registro ya existe. Verifica la información.' },
      
      // Wallet errors
      { pattern: /insufficient.*balance|saldo.*insuficiente/i, message: 'Saldo insuficiente en tu wallet.' },
      { pattern: /wallet.*locked|funds.*locked/i, message: 'Fondos bloqueados. Intenta nuevamente en unos momentos.' },
    ];

    // Try to match error message to known patterns
    for (const mapping of errorMappings) {
      if (mapping.pattern.test(errorMessage) || mapping.pattern.test(context)) {
        return mapping.message;
      }
    }

    // Try to extract meaningful message from error object
    if (error && typeof error === 'object') {
      // Check for common error properties
      if ('message' in error && typeof error.message === 'string') {
        const msg = error.message;
        // If it's already user-friendly (no technical jargon), return it
        if (!msg.includes('Error:') && !msg.includes('at ') && !msg.includes('Exception')) {
          return msg;
        }
      }
      
      // Check for error code or type
      if ('code' in error) {
        const code = String(error.code);
        if (code === 'PGRST116') return 'No se encontró el recurso solicitado.';
        if (code === '23505') return 'Este registro ya existe.';
        if (code === '42501') return 'No tienes permisos para realizar esta acción.';
      }
    }

    // Default fallback message
    return 'Ocurrió un error inesperado. Por favor intenta nuevamente. Si el problema persiste, contacta soporte.';
  }

  /**
   * Show toast notification with appropriate type
   * @private
   */
  private showToast(message: string, severity: 'error' | 'warning' | 'critical'): void {
    const title = severity === 'critical' ? 'Error Crítico' : severity === 'error' ? 'Error' : 'Advertencia';
    switch (severity) {
      case 'critical':
      case 'error':
        this.toast.error(title, message);
        break;
      case 'warning':
        this.toast.warning(title, message);
        break;
      default:
        this.toast.error(title, message);
    }
  }
}










