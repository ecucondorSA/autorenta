/**
 * Utilidades para validación de tokens de MercadoPago
 *
 * Este archivo NO importa el SDK de mercadopago para evitar BOOT_ERROR en Deno.
 * Usar este archivo en lugar de mercadopago-sdk.ts para funciones edge.
 */

// ============================================================================
// Token Validation Utilities (SDK-free)
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
 * Timeout configuration for different operation types
 */
export const MP_TIMEOUT = {
  WEBHOOK: 3000,   // 3s for webhooks
  DEFAULT: 8000,   // 8s for manual operations
} as const;

/**
 * Base URL para la API de MercadoPago
 */
export const MP_API_BASE = 'https://api.mercadopago.com/v1';
