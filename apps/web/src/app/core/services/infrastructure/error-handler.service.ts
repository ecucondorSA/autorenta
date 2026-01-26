import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { PaymentBusinessError } from '@core/services/payments/mercadopago-payment.service';
import { getErrorMessage } from '@core/utils/type-guards';
import { environment } from '@environment';

/**
 * ✅ FIX: Public routes where auth errors should be silently ignored
 * These pages don't require authentication to view, so we shouldn't
 * show "Tu sesión expiró" errors when browsing without login
 */
const PUBLIC_ROUTES = [
  '/cars', // Car listings
  '/cars/', // Car detail (with ID)
  '/marketplace', // Marketplace
  '/how-it-works', // How it works
  '/about', // About page
  '/contact', // Contact
  '/faq', // FAQ
  '/terms', // Terms
  '/privacy', // Privacy
  '/auth', // Auth pages
  '/', // Home
];

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
  private readonly toast = inject(NotificationManagerService);
  private readonly router = inject(Router);

  /**
   * ✅ FIX: Check if current route is public (no auth required)
   */
  private isPublicRoute(): boolean {
    const currentUrl = this.router.url || '/';
    return PUBLIC_ROUTES.some((route) => {
      if (route === '/') {
        return currentUrl === '/';
      }
      return currentUrl.startsWith(route);
    });
  }

  /**
   * ✅ FIX: Check if error is an authentication error
   */
  private isAuthError(error: unknown): boolean {
    const errorMessage = this.extractErrorMessage(error).toLowerCase();
    return /unauthorized|401|invalid.*token|expired.*token|jwt|auth|no autenticado|sesion expirada|sesión expirada/i.test(
      errorMessage,
    );
  }

  /**
   * ✅ FIX: Detect unauthenticated user flow errors (expected in guest flows)
   */
  private isUnauthenticatedError(error: unknown): boolean {
    const errorMessage = this.extractErrorMessage(error).toLowerCase();
    return /usuario no autenticado|no autenticado|getuser\(\).*retorn[oó] null|sesion expirada|sesión expirada/i.test(
      errorMessage,
    );
  }

  /**
   * ✅ FIX: Ignore known benign UI/runtime errors to reduce Sentry noise
   * Includes: Facebook SDK errors, ResizeObserver, style loading, ad blockers
   */
  private isBenignRuntimeError(error: unknown): boolean {
    // Check for explicitly marked expected errors
    if (error instanceof Error && error.name === 'FacebookExpectedError') {
      return true;
    }

    const errorMessage = this.extractErrorMessage(error).toLowerCase();

    // Comprehensive list of benign error patterns
    const benignPatterns = [
      // Browser/DOM errors
      'style is not done loading',
      'resizeobserver loop',
      'loading chunk',
      'chunkloaderror',

      // Facebook SDK errors (expected when ad blockers are active)
      'fb is not defined',
      'fb not defined',
      'facebook sdk',
      'facebook login',
      'fblogin',
      'sdk failed',
      'ad blocker',
      'bloqueador de anuncios',
      'facebook no está disponible',
      'facebook not available',

      // WebAuthn errors (expected user behavior)
      'webauthn',
      'notallowederror',
      'the operation either timed out',
      'authenticator',

      // Network/timeout (often transient)
      'network request failed',
      'failed to fetch',
      'timeout exceeded',

      // Angular known issues
      'ng0750',
      'expressionchanged',
    ];

    return benignPatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return '';
  }

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
    // ✅ FIX: Skip showing auth errors on public routes
    // Users browsing without login shouldn't see "Tu sesión expiró" messages
    if (this.isAuthError(error) && this.isPublicRoute()) {
      this.logger.debug('Suppressing auth error on public route', 'ErrorHandlerService', {
        context,
        route: this.router.url,
      });
      // Still log for debugging, but don't show toast to user
      this.logError(error, context, 'warning');
      return;
    }

    // ✅ FIX: Treat benign runtime errors as expected (avoid Sentry noise)
    if (this.isBenignRuntimeError(error)) {
      this.logger.info('Benign runtime error suppressed', 'ErrorHandlerService', {
        context,
        route: this.router.url,
        message: this.extractErrorMessage(error),
      });
      return;
    }

    // ✅ FIX: Treat unauthenticated errors as expected (avoid Sentry noise)
    if (this.isUnauthenticatedError(error)) {
      if (!this.isPublicRoute() && showToUser) {
        this.toast.warning('Sesión requerida', 'Por favor inicia sesión para continuar.');
      }

      this.logger.info('Unauthenticated access blocked', 'ErrorHandlerService', {
        context,
        route: this.router.url,
        message: this.extractErrorMessage(error),
      });
      return;
    }

    // 1. Log error with appropriate severity
    this.logError(error, context, severity);

    // 2. Show user-friendly message if requested
    if (showToUser) {
      const userMessage = this.getUserFriendlyMessage(error, context);
      this.showToast(userMessage, severity);
    }

    // 3. Handle critical errors specially
    if (severity === 'critical' && error instanceof Error) {
      this.logger.critical(`Critical error in ${context}`, error?.message || String(error));
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
      this.toast.warning('Validación', message);
    }
    // Validation errors are usually expected, so we don't log them
  }

  /**
   * Handle payment errors with special handling
   * ✅ FIX: Enhanced to handle PaymentBusinessError with specific MercadoPago rejection codes
   */
  handlePaymentError(error: unknown, context = 'Payment processing', showToUser = true): void {
    // Check if it's a PaymentBusinessError with detailed rejection info
    if (error instanceof PaymentBusinessError) {
      const friendlyMessage = this.getPaymentBusinessErrorMessage(error);
      this.logError(error, context, 'warning'); // Business errors are warnings, not critical

      if (showToUser) {
        this.toast.error('Error de Pago', friendlyMessage);
      }
      return;
    }

    // Non-business payment errors are critical
    this.handleError(error, context, showToUser, 'critical');
  }

  /**
   * Get user-friendly message for PaymentBusinessError based on MercadoPago rejection codes
   * @private
   */
  private getPaymentBusinessErrorMessage(error: PaymentBusinessError): string {
    const response = error.paymentResponse;
    const statusDetail = (response as { status_detail?: string }).status_detail || '';
    const code = (response as { code?: string }).code || '';

    // MercadoPago rejection code mappings
    // Reference: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/response-handling/collection-results
    const rejectionMappings: Record<string, string> = {
      // Card-related rejections
      cc_rejected_bad_filled_card_number: 'El número de tarjeta es incorrecto. Verificá los datos.',
      cc_rejected_bad_filled_date: 'La fecha de vencimiento es incorrecta.',
      cc_rejected_bad_filled_other: 'Verificá los datos de la tarjeta.',
      cc_rejected_bad_filled_security_code: 'El código de seguridad (CVV) es incorrecto.',
      cc_rejected_blacklist: 'Tu tarjeta no puede ser utilizada. Contactá a tu banco.',
      cc_rejected_call_for_authorize: 'Debés autorizar este pago con tu banco.',
      cc_rejected_card_disabled: 'Tu tarjeta está deshabilitada. Contactá a tu banco.',
      cc_rejected_card_error: 'No pudimos procesar tu tarjeta. Intentá con otra.',
      cc_rejected_duplicated_payment: 'Ya procesaste un pago similar. Esperá unos minutos.',
      cc_rejected_high_risk: 'Tu pago fue rechazado por seguridad. Intentá con otro medio.',
      cc_rejected_insufficient_amount: 'Tu tarjeta no tiene fondos suficientes.',
      cc_rejected_invalid_installments: 'Tu tarjeta no soporta esa cantidad de cuotas.',
      cc_rejected_max_attempts: 'Alcanzaste el límite de intentos. Intentá mañana.',
      cc_rejected_other_reason: 'Tu tarjeta no pudo procesar el pago. Probá con otra.',

      // Account/wallet rejections
      insufficient_amount: 'Fondos insuficientes. Cargá saldo o usá otra tarjeta.',
      rejected_by_bank: 'Tu banco rechazó el pago. Contactalos para más información.',
      rejected_by_regulations: 'El pago fue rechazado por regulaciones bancarias.',

      // Fraud/security
      pending_review_manual: 'Tu pago está en revisión. Te notificaremos pronto.',
      pending_waiting_payment: 'Esperando confirmación del pago...',

      // Generic
      accredited: 'Pago acreditado correctamente.',
    };

    // Try to match status_detail first (most specific)
    if (statusDetail && rejectionMappings[statusDetail]) {
      return rejectionMappings[statusDetail];
    }

    // Try to match by code
    if (code && rejectionMappings[code]) {
      return rejectionMappings[code];
    }

    // Pattern matching for partial matches
    const lowerDetail = statusDetail.toLowerCase();
    if (lowerDetail.includes('insufficient')) {
      return 'Fondos insuficientes. Verificá el saldo de tu cuenta o tarjeta.';
    }
    if (lowerDetail.includes('rejected') || lowerDetail.includes('declined')) {
      return 'Tu tarjeta fue rechazada. Probá con otro medio de pago.';
    }
    if (lowerDetail.includes('expired')) {
      return 'Tu tarjeta está vencida. Por favor usá otra.';
    }
    if (lowerDetail.includes('security') || lowerDetail.includes('cvv')) {
      return 'Error de seguridad. Verificá el código CVV.';
    }

    // Fallback to original error message if it's user-friendly
    if (error.message && !this.isTechnicalJargon(error.message)) {
      return error.message;
    }

    // Ultimate fallback
    return 'No pudimos procesar tu pago. Verificá los datos o intentá con otro medio de pago.';
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
  private logError(
    error: unknown,
    context: string,
    severity: 'error' | 'warning' | 'critical',
  ): void {
    const message = `Error in ${context}`;

    switch (severity) {
      case 'critical':
        if (error instanceof Error) {
          this.logger.critical(message, error?.message || String(error));
        } else {
          this.logger.critical(message, String(error));
        }
        break;
      case 'warning':
        this.logger.warn(message, String(error));
        break;
      case 'error':
      default:
        this.logger.error(
          message,
          'ErrorHandlerService',
          error instanceof Error ? error : new Error(getErrorMessage(error)),
        );
        break;
    }
  }

  /**
   * Get user-friendly error message
   * Maps technical errors to friendly messages
   * ✅ P0-020 FIX: Hide stack traces and technical details in production
   * @private
   */
  private getUserFriendlyMessage(error: unknown, context: string): string {
    // ✅ P0-020: In production, never expose raw error messages
    // Always return sanitized, user-friendly messages

    // If it's already a user-friendly string (no technical jargon), return it
    if (typeof error === 'string') {
      // In production, check if message contains technical terms
      if (environment.production && this.isTechnicalJargon(error)) {
        return 'Ocurrió un error inesperado. Por favor intenta nuevamente.';
      }
      return error;
    }

    // Extract error message if it's an Error object
    let errorMessage = '';
    if (error instanceof Error) {
      errorMessage = error.message.toLowerCase();

      // ✅ P0-020: In production, NEVER expose Error objects directly
      if (environment.production && this.isTechnicalJargon(error.message)) {
        // Return generic message, log details to Sentry only
        this.logger.error(
          'Technical error hidden from user (production)',
          'ErrorHandlerService',
          error,
        );
        errorMessage = ''; // Clear to force mapping to user-friendly message
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message).toLowerCase();

      // ✅ P0-020: Same protection for error-like objects
      if (environment.production && this.isTechnicalJargon(String(error.message))) {
        this.logger.error(
          'Technical error hidden from user (production)',
          'ErrorHandlerService',
          error instanceof Error ? error : new Error(String(error.message)),
        );
        errorMessage = '';
      }
    }

    // Map common error patterns to user-friendly messages
    const errorMappings: Array<{ pattern: RegExp; message: string }> = [
      // Network errors
      {
        pattern: /network|fetch|connection|timeout|failed to fetch/i,
        message: 'Error de conexión. Verifica tu internet e intenta nuevamente.',
      },
      {
        pattern: /networkerror|network error/i,
        message: 'Sin conexión a internet. Verifica tu conexión.',
      },

      // Authentication errors
      {
        pattern: /unauthorized|401|invalid.*token|expired.*token/i,
        message: 'Tu sesión expiró. Por favor inicia sesión nuevamente.',
      },
      {
        pattern: /forbidden|403|permission|access denied/i,
        message: 'No tienes permisos para realizar esta acción.',
      },

      // Not found errors
      { pattern: /not found|404/i, message: 'No se encontró el recurso solicitado.' },

      // Server errors
      {
        pattern: /500|internal server error|server error/i,
        message: 'Error del servidor. Nuestro equipo ha sido notificado.',
      },
      {
        pattern: /503|service unavailable/i,
        message: 'El servicio no está disponible temporalmente. Intenta en unos minutos.',
      },

      // Validation errors
      {
        pattern: /validation|invalid|required|missing/i,
        message: 'Datos inválidos. Verifica la información ingresada.',
      },

      // Payment errors
      {
        pattern: /payment|payment.*failed|insufficient.*funds/i,
        message: 'Error al procesar el pago. Verifica tu método de pago e intenta nuevamente.',
      },
      {
        pattern: /card.*declined|card.*invalid/i,
        message: 'Tu tarjeta fue rechazada. Verifica los datos o usa otro método de pago.',
      },

      // Booking errors
      {
        pattern: /booking.*unavailable|car.*unavailable|not.*available/i,
        message: 'El auto no está disponible para esas fechas. Por favor elige otras fechas.',
      },
      {
        pattern: /booking.*exists|already.*booked/i,
        message: 'Ya existe una reserva para este auto en esas fechas.',
      },
      {
        pattern: /invalid.*booking.*status|booking.*not.*pending|not.*pending.*payment/i,
        message:
          'El estado de la reserva no permite crear el pago. Por favor intenta crear una nueva reserva.',
      },

      // Supabase errors
      {
        pattern: /row.*security|rls|policy/i,
        message: 'No tienes permisos para realizar esta acción.',
      },
      {
        pattern: /duplicate.*key|unique.*constraint/i,
        message: 'Este registro ya existe. Verifica la información.',
      },

      // Wallet errors
      {
        pattern: /insufficient.*balance|saldo.*insuficiente/i,
        message: 'Saldo insuficiente en tu wallet.',
      },
      {
        pattern: /wallet.*locked|funds.*locked/i,
        message: 'Fondos bloqueados. Intenta nuevamente en unos momentos.',
      },
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
    const title =
      severity === 'critical' ? 'Error Crítico' : severity === 'error' ? 'Error' : 'Advertencia';
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

  /**
   * ✅ P0-020: Check if message contains technical jargon
   * Technical terms should never be shown to users in production
   * @private
   */
  private isTechnicalJargon(message: string): boolean {
    const technicalPatterns = [
      /Error:/i,
      /Exception/i,
      /at\s+\w+\./i, // Stack trace pattern: "at Function.method"
      /\w+\.\w+\(/i, // Method call pattern: "service.method("
      /line\s+\d+/i, // Line number references
      /column\s+\d+/i, // Column number references
      /\w+Error/i, // Error types: TypeError, ReferenceError, etc.
      /null\s+is\s+not/i, // "null is not an object"
      /undefined\s+is\s+not/i, // "undefined is not a function"
      /cannot\s+read\s+property/i,
      /cannot\s+access/i,
      /'[a-z_]+'\s+of\s+(null|undefined)/i, // "'property' of undefined"
      /\[\w+\]/i, // Property access: [propertyName]
      /stack\s*:/i, // Stack property
      /PGRST\d+/i, // Postgres/Supabase error codes
      /23\d{3}/i, // PostgreSQL error codes (23xxx)
      /42\d{3}/i, // PostgreSQL error codes (42xxx)
      /function\s+\w+/i, // Function references
      /class\s+\w+/i, // Class references
      /RPC\s+/i, // RPC errors
      /SQL\s+/i, // SQL errors
      /database\s+/i, // Database errors (be cautious - might be user-friendly in some contexts)
    ];

    return technicalPatterns.some((pattern) => pattern.test(message));
  }
}
