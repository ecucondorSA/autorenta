/**
 * Helper para inicializar y usar el SDK de MercadoPago
 *
 * Proporciona una interfaz unificada para todas las funciones que usan MercadoPago
 *
 * Nota: El SDK de MercadoPago para Node.js usa una estructura modular.
 * Importamos las clases necesarias desde el paquete mercadopago.
 */

// Importar SDK de MercadoPago
// El SDK v2 usa una estructura modular con clases separadas
import { MercadoPagoConfig, Preference, Payment, Customer, Refund, MoneyRequest } from 'mercadopago';

// ============================================================================
// Token Validation Utilities
// ============================================================================

export interface TokenValidationOptions {
  /** Si true, permite tokens TEST con warning en lugar de error. Default: false */
  allowTestTokens?: boolean;
  /** Contexto para mensajes de error (nombre de la función que llama) */
  context: string;
}

/**
 * Limpia y valida un token de MercadoPago.
 * Por defecto rechaza tokens de sandbox (TEST-*).
 *
 * @param rawToken - Token sin procesar
 * @param options - Opciones de validación
 * @returns Token limpio y validado
 * @throws Error si el token es de sandbox y allowTestTokens es false
 */
export function ensureProductionToken(
  rawToken: string,
  options: TokenValidationOptions
): string {
  const { allowTestTokens = false, context } = options;
  const cleaned = rawToken.trim().replace(/[\r\n\t\s]/g, '');

  const isTestToken = cleaned.toUpperCase().includes('TEST-') || cleaned.startsWith('TEST');

  if (isTestToken) {
    if (allowTestTokens) {
      console.warn(`[${context}] WARNING: Using TEST/sandbox token. This should only be used in development.`);
    } else {
      throw new Error(
        `${context}: MERCADOPAGO_ACCESS_TOKEN parece ser de sandbox (TEST). Configura el token de producción APP_USR-*`
      );
    }
  }

  return cleaned;
}

/**
 * Obtiene y valida el token de MercadoPago desde variables de entorno.
 *
 * @param context - Nombre de la función que llama (para mensajes de error)
 * @param allowTestTokens - Si true, permite tokens TEST. Default: false
 * @returns Token limpio y validado
 * @throws Error si el token no está configurado o es de sandbox (cuando no permitido)
 */
export function getMercadoPagoAccessToken(
  context: string,
  allowTestTokens = false
): string {
  const rawToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!rawToken) {
    throw new Error(`${context}: MERCADOPAGO_ACCESS_TOKEN environment variable not configured`);
  }
  return ensureProductionToken(rawToken, { context, allowTestTokens });
}

/**
 * P1-3: Timeout configuration for different operation types
 *
 * - WEBHOOK_TIMEOUT: 3s for webhook handlers (high frequency, strict limits)
 * - DEFAULT_TIMEOUT: 8s for manual operations (deposits, refunds)
 *
 * Rationale: Edge Function max is 25s. Webhooks need headroom for DB operations.
 */
export const MP_TIMEOUT = {
  WEBHOOK: 3000,   // 3s for webhooks
  DEFAULT: 8000,   // 8s for manual operations
} as const;

export interface MercadoPagoClientOptions {
  /** Timeout in ms. Use MP_TIMEOUT constants. Default: MP_TIMEOUT.DEFAULT (8000ms) */
  timeoutMs?: number;
  /** Custom idempotency key. Default: crypto.randomUUID() */
  idempotencyKey?: string;
}

/**
 * Inicializa el cliente de MercadoPago con el access token
 *
 * @param accessToken - MercadoPago access token
 * @param options - Configuration options (timeout, idempotencyKey)
 */
export function createMercadoPagoClient(
  accessToken: string,
  options: MercadoPagoClientOptions = {}
): MercadoPagoConfig {
  const {
    timeoutMs = MP_TIMEOUT.DEFAULT,
    idempotencyKey = crypto.randomUUID(),
  } = options;

  const cleanToken = accessToken.trim().replace(/[\r\n\t\s]/g, '');

  return new MercadoPagoConfig({
    accessToken: cleanToken,
    options: {
      timeout: timeoutMs,
      idempotencyKey,
    },
  });
}

/**
 * Obtiene el cliente de MercadoPago desde variables de entorno
 */
export function getMercadoPagoClient(): MercadoPagoConfig {
  const rawToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!rawToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable not configured');
  }
  return createMercadoPagoClient(rawToken);
}

/**
 * Crea un cliente de MercadoPago con un token personalizado (para OAuth)
 */
export function createMercadoPagoClientWithToken(token: string): MercadoPagoConfig {
  return createMercadoPagoClient(token);
}

/**
 * Helper para crear preferencias de pago
 */
export function getPreferenceClient(config: MercadoPagoConfig): Preference {
  return new Preference(config);
}

/**
 * Helper para obtener información de pagos
 */
export function getPaymentClient(config: MercadoPagoConfig): Payment {
  return new Payment(config);
}

/**
 * Helper para crear/obtener customers
 */
export function getCustomerClient(config: MercadoPagoConfig): Customer {
  return new Customer(config);
}

/**
 * Helper para procesar reembolsos
 */
export function getRefundClient(config: MercadoPagoConfig): Refund {
  return new Refund(config);
}

/**
 * Helper para money requests (retiros)
 */
export function getMoneyRequestClient(config: MercadoPagoConfig): MoneyRequest {
  return new MoneyRequest(config);
}

