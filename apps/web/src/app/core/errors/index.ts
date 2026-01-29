/**
 * Custom Error Classes for AutoRenta
 *
 * Type-safe error classes with error codes for better error handling.
 * These errors can be caught and handled specifically based on their type and code.
 */

// ============================================================================
// BASE ERROR
// ============================================================================

/**
 * Base error class for all AutoRenta errors
 */
export abstract class AutoRentaError extends Error {
  abstract readonly code: string;
  abstract readonly category: 'payment' | 'booking' | 'wallet' | 'auth' | 'validation' | 'network';
  readonly timestamp: Date = new Date();
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }
}

// ============================================================================
// PAYMENT ERRORS
// ============================================================================

export type PaymentErrorCode =
  | 'PAYMENT_FAILED'
  | 'PAYMENT_DECLINED'
  | 'CARD_INVALID'
  | 'CARD_EXPIRED'
  | 'INSUFFICIENT_FUNDS'
  | 'PAYMENT_TIMEOUT'
  | 'PAYMENT_CANCELLED'
  | 'PAYMENT_DUPLICATE'
  | 'PRICE_LOCK_EXPIRED'
  | 'PAYMENT_ALREADY_PROCESSED'
  | 'PAYMENT_GATEWAY_ERROR'
  | 'INVALID_PAYMENT_METHOD';

export class PaymentError extends AutoRentaError {
  readonly category = 'payment' as const;
  readonly code: PaymentErrorCode;
  readonly paymentId?: string;
  readonly bookingId?: string;

  constructor(
    code: PaymentErrorCode,
    message: string,
    options?: {
      paymentId?: string;
      bookingId?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(message, options?.context);
    this.code = code;
    this.paymentId = options?.paymentId;
    this.bookingId = options?.bookingId;
  }

  static cardDeclined(bookingId?: string): PaymentError {
    return new PaymentError(
      'PAYMENT_DECLINED',
      'Tu tarjeta fue rechazada. Verifica los datos o usa otro método de pago.',
      { bookingId },
    );
  }

  static priceLockExpired(bookingId: string): PaymentError {
    return new PaymentError(
      'PRICE_LOCK_EXPIRED',
      'El precio ha expirado. Por favor recarga la página para ver el precio actualizado.',
      { bookingId },
    );
  }

  static alreadyProcessed(bookingId: string, paymentId?: string): PaymentError {
    return new PaymentError(
      'PAYMENT_ALREADY_PROCESSED',
      'Este pago ya fue procesado anteriormente.',
      { bookingId, paymentId },
    );
  }

  static gatewayError(message: string, bookingId?: string): PaymentError {
    return new PaymentError('PAYMENT_GATEWAY_ERROR', message, { bookingId });
  }
}

// ============================================================================
// BOOKING ERRORS
// ============================================================================

export type BookingErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_UNAVAILABLE'
  | 'BOOKING_CONFLICT'
  | 'BOOKING_INVALID_STATUS'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_EXPIRED'
  | 'CAR_UNAVAILABLE'
  | 'INVALID_DATES'
  | 'DATE_IN_PAST'
  | 'MINIMUM_RENTAL_PERIOD'
  | 'MAXIMUM_RENTAL_PERIOD'
  | 'BLOCKED_DATES';

export class BookingError extends AutoRentaError {
  readonly category = 'booking' as const;
  readonly code: BookingErrorCode;
  readonly bookingId?: string;
  readonly carId?: string;

  constructor(
    code: BookingErrorCode,
    message: string,
    options?: {
      bookingId?: string;
      carId?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(message, options?.context);
    this.code = code;
    this.bookingId = options?.bookingId;
    this.carId = options?.carId;
  }

  static notFound(bookingId: string): BookingError {
    return new BookingError('BOOKING_NOT_FOUND', 'No se encontró la reserva solicitada.', {
      bookingId,
    });
  }

  static carUnavailable(carId: string, startDate: Date, endDate: Date): BookingError {
    return new BookingError(
      'CAR_UNAVAILABLE',
      'El auto no está disponible para las fechas seleccionadas.',
      {
        carId,
        context: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    );
  }

  static invalidStatus(
    bookingId: string,
    currentStatus: string,
    expectedStatus: string,
  ): BookingError {
    return new BookingError(
      'BOOKING_INVALID_STATUS',
      `La reserva no está en estado válido para esta operación.`,
      {
        bookingId,
        context: { currentStatus, expectedStatus },
      },
    );
  }

  static conflict(carId: string, conflictingBookingId: string): BookingError {
    return new BookingError(
      'BOOKING_CONFLICT',
      'Ya existe una reserva para este auto en las fechas seleccionadas.',
      {
        carId,
        context: { conflictingBookingId },
      },
    );
  }
}

// ============================================================================
// WALLET ERRORS
// ============================================================================

export type WalletErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'WALLET_NOT_FOUND'
  | 'FUNDS_LOCKED'
  | 'LOCK_FAILED'
  | 'UNLOCK_FAILED'
  | 'RATE_LIMITED'
  | 'TRANSACTION_FAILED'
  | 'WITHDRAWAL_LIMIT_EXCEEDED'
  | 'DEPOSIT_FAILED';

export class WalletError extends AutoRentaError {
  readonly category = 'wallet' as const;
  readonly code: WalletErrorCode;
  readonly userId?: string;
  readonly transactionId?: string;

  constructor(
    code: WalletErrorCode,
    message: string,
    options?: {
      userId?: string;
      transactionId?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(message, options?.context);
    this.code = code;
    this.userId = options?.userId;
    this.transactionId = options?.transactionId;
  }

  static insufficientBalance(required: number, available: number, userId?: string): WalletError {
    return new WalletError(
      'INSUFFICIENT_BALANCE',
      `Saldo insuficiente. Necesitas $${required.toFixed(2)} pero tienes $${available.toFixed(2)} disponible.`,
      {
        userId,
        context: { required, available },
      },
    );
  }

  static rateLimited(userId?: string): WalletError {
    return new WalletError(
      'RATE_LIMITED',
      'Demasiados intentos de bloqueo. Por favor espera un momento.',
      { userId },
    );
  }

  static lockFailed(bookingId: string, reason?: string): WalletError {
    return new WalletError(
      'LOCK_FAILED',
      reason || 'No se pudieron bloquear los fondos para esta reserva.',
      { context: { bookingId } },
    );
  }
}

// ============================================================================
// AUTH ERRORS
// ============================================================================

export type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_NOT_VERIFIED'
  | 'PERMISSION_DENIED';

export class AuthError extends AutoRentaError {
  readonly category = 'auth' as const;
  readonly code: AuthErrorCode;
  readonly userId?: string;

  constructor(
    code: AuthErrorCode,
    message: string,
    options?: {
      userId?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(message, options?.context);
    this.code = code;
    this.userId = options?.userId;
  }

  static sessionExpired(): AuthError {
    return new AuthError(
      'SESSION_EXPIRED',
      'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
    );
  }

  static permissionDenied(action: string): AuthError {
    return new AuthError('PERMISSION_DENIED', 'No tienes permisos para realizar esta acción.', {
      context: { action },
    });
  }

  static accountSuspended(userId: string, reason?: string): AuthError {
    return new AuthError(
      'ACCOUNT_SUSPENDED',
      'Tu cuenta ha sido suspendida. Contacta soporte para más información.',
      { userId, context: { reason } },
    );
  }
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export type ValidationErrorCode =
  | 'REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  | 'OUT_OF_RANGE'
  | 'INVALID_DATE'
  | 'INVALID_AMOUNT'
  | 'DUPLICATE_VALUE';

export class ValidationError extends AutoRentaError {
  readonly category = 'validation' as const;
  readonly code: ValidationErrorCode;
  readonly field?: string;

  constructor(
    code: ValidationErrorCode,
    message: string,
    options?: {
      field?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(message, options?.context);
    this.code = code;
    this.field = options?.field;
  }

  static required(field: string): ValidationError {
    return new ValidationError('REQUIRED_FIELD', `El campo ${field} es requerido.`, { field });
  }

  static invalidFormat(field: string, expectedFormat?: string): ValidationError {
    const message = expectedFormat
      ? `El formato de ${field} no es válido. Formato esperado: ${expectedFormat}`
      : `El formato de ${field} no es válido.`;
    return new ValidationError('INVALID_FORMAT', message, { field, context: { expectedFormat } });
  }

  static invalidAmount(amount: number, min?: number, max?: number): ValidationError {
    let message = `Monto inválido: $${amount}`;
    if (min !== undefined && max !== undefined) {
      message += `. Debe estar entre $${min} y $${max}.`;
    } else if (min !== undefined) {
      message += `. Debe ser mayor a $${min}.`;
    } else if (max !== undefined) {
      message += `. Debe ser menor a $${max}.`;
    }
    return new ValidationError('INVALID_AMOUNT', message, {
      context: { amount, min, max },
    });
  }
}

// ============================================================================
// NETWORK ERRORS
// ============================================================================

export type NetworkErrorCode =
  | 'CONNECTION_FAILED'
  | 'TIMEOUT'
  | 'SERVICE_UNAVAILABLE'
  | 'SERVER_ERROR';

export class NetworkError extends AutoRentaError {
  readonly category = 'network' as const;
  readonly code: NetworkErrorCode;
  readonly statusCode?: number;

  constructor(
    code: NetworkErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      context?: Record<string, unknown>;
    },
  ) {
    super(message, options?.context);
    this.code = code;
    this.statusCode = options?.statusCode;
  }

  static connectionFailed(): NetworkError {
    return new NetworkError(
      'CONNECTION_FAILED',
      'Error de conexión. Verifica tu internet e intenta nuevamente.',
    );
  }

  static timeout(operation: string): NetworkError {
    return new NetworkError(
      'TIMEOUT',
      `La operación "${operation}" tardó demasiado. Intenta nuevamente.`,
      {
        context: { operation },
      },
    );
  }

  static serverError(statusCode: number): NetworkError {
    return new NetworkError(
      'SERVER_ERROR',
      'Error del servidor. Nuestro equipo ha sido notificado.',
      { statusCode },
    );
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isAutoRentaError(error: unknown): error is AutoRentaError {
  return error instanceof AutoRentaError;
}

export function isPaymentError(error: unknown): error is PaymentError {
  return error instanceof PaymentError;
}

export function isBookingError(error: unknown): error is BookingError {
  return error instanceof BookingError;
}

export function isWalletError(error: unknown): error is WalletError {
  return error instanceof WalletError;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

// ============================================================================
// SUPABASE ERROR HANDLER
// ============================================================================

/**
 * PostgreSQL/Supabase error interface
 * Matches the structure returned by Supabase client
 */
export interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Check if error is a Supabase/PostgresREST error
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  return error !== null && typeof error === 'object' && ('code' in error || 'message' in error);
}

/**
 * PostgreSQL error code mapping
 * See: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_CODES: Record<
  string,
  { type: 'auth' | 'validation' | 'network' | 'booking'; factory: (msg: string) => AutoRentaError }
> = {
  // Not found
  PGRST116: {
    type: 'booking',
    factory: (msg) => new BookingError('BOOKING_NOT_FOUND', msg || 'Recurso no encontrado.'),
  },

  // Permission denied
  '42501': {
    type: 'auth',
    factory: (msg) =>
      new AuthError('PERMISSION_DENIED', msg || 'No tienes permisos para realizar esta acción.'),
  },

  // Unique violation (duplicate)
  '23505': {
    type: 'validation',
    factory: (msg) => new ValidationError('DUPLICATE_VALUE', msg || 'Este registro ya existe.'),
  },

  // Foreign key violation
  '23503': {
    type: 'validation',
    factory: (msg) =>
      new ValidationError('INVALID_FORMAT', msg || 'Referencia inválida a otro registro.'),
  },

  // Not null violation
  '23502': {
    type: 'validation',
    factory: (msg) => new ValidationError('REQUIRED_FIELD', msg || 'Falta un campo requerido.'),
  },

  // Check constraint violation
  '23514': {
    type: 'validation',
    factory: (msg) => new ValidationError('OUT_OF_RANGE', msg || 'Valor fuera de rango permitido.'),
  },

  // Insufficient privilege
  '42000': {
    type: 'auth',
    factory: (msg) => new AuthError('PERMISSION_DENIED', msg || 'Privilegios insuficientes.'),
  },

  // Connection errors
  '08000': {
    type: 'network',
    factory: (msg) =>
      new NetworkError('CONNECTION_FAILED', msg || 'Error de conexión a la base de datos.'),
  },
  '08003': {
    type: 'network',
    factory: (msg) => new NetworkError('CONNECTION_FAILED', msg || 'Conexión no existe.'),
  },
  '08006': {
    type: 'network',
    factory: (msg) => new NetworkError('CONNECTION_FAILED', msg || 'Error de conexión.'),
  },

  // Query timeout
  '57014': {
    type: 'network',
    factory: (msg) => new NetworkError('TIMEOUT', msg || 'La consulta tardó demasiado.'),
  },

  // Column/table doesn't exist (schema mismatch)
  '42703': {
    type: 'network',
    factory: (msg) => new NetworkError('SERVER_ERROR', msg || 'Error de esquema de base de datos.'),
  },
  '42P01': {
    type: 'network',
    factory: (msg) => new NetworkError('SERVER_ERROR', msg || 'Tabla no encontrada.'),
  },
};

/**
 * Centralized Supabase error handler
 *
 * Converts PostgreSQL/Supabase errors to typed AutoRenta errors.
 * Use this in catch blocks when handling Supabase responses.
 *
 * @example
 * ```typescript
 * const { data, error } = await supabase.from('bookings').select();
 * if (error) {
 *   throw handleSupabaseError(error, 'Loading bookings');
 * }
 * ```
 *
 * @param error - The Supabase error object
 * @param context - Optional context for logging (e.g., 'Loading cars', 'Creating booking')
 * @returns Typed AutoRentaError subclass
 */
export function handleSupabaseError(error: SupabaseError, context?: string): AutoRentaError {
  const code = error.code || '';
  const message = error.message || 'Error desconocido';

  // Check for known PostgreSQL error codes
  const mapping = PG_ERROR_CODES[code];
  if (mapping) {
    return mapping.factory(message);
  }

  // Handle PGRST (PostgREST) specific codes
  if (code.startsWith('PGRST')) {
    // PGRST116: No rows found (not really an error for many use cases)
    if (code === 'PGRST116') {
      return new BookingError('BOOKING_NOT_FOUND', 'No se encontró el recurso solicitado.');
    }
    // Other PostgREST errors
    return new NetworkError('SERVER_ERROR', `Error de API: ${message}`, {
      context: { pgrstCode: code },
    });
  }

  // Handle RLS (Row Level Security) errors
  if (
    message.toLowerCase().includes('row-level security') ||
    message.toLowerCase().includes('rls') ||
    message.toLowerCase().includes('policy')
  ) {
    return new AuthError('PERMISSION_DENIED', 'No tienes permisos para acceder a este recurso.');
  }

  // Handle network-like errors
  if (
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('connection') ||
    message.toLowerCase().includes('timeout')
  ) {
    return NetworkError.connectionFailed();
  }

  // Default: return as network/server error with context
  return new NetworkError('SERVER_ERROR', context ? `Error en ${context}: ${message}` : message, {
    context: { originalCode: code, hint: error.hint, details: error.details },
  });
}

/**
 * Check if a Supabase error is "not found" (PGRST116)
 * Useful for optional lookups where missing data is expected
 *
 * @example
 * ```typescript
 * const { data, error } = await supabase.from('optional_table').select().single();
 * if (error && !isNotFoundError(error)) {
 *   throw handleSupabaseError(error);
 * }
 * return data ?? null;
 * ```
 */
export function isNotFoundError(error: SupabaseError): boolean {
  return error.code === 'PGRST116';
}

/**
 * Check if a Supabase error is a permission/RLS error
 */
export function isPermissionError(error: SupabaseError): boolean {
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();

  return (
    code === '42501' ||
    code === '42000' ||
    message.includes('row-level security') ||
    message.includes('rls') ||
    message.includes('policy') ||
    message.includes('permission denied')
  );
}

/**
 * Check if a Supabase error is a duplicate/unique constraint error
 */
export function isDuplicateError(error: SupabaseError): boolean {
  return error.code === '23505';
}
