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

/**
 * Inicializa el cliente de MercadoPago con el access token
 */
export function createMercadoPagoClient(accessToken: string): MercadoPagoConfig {
  const cleanToken = accessToken.trim().replace(/[\r\n\t\s]/g, '');

  return new MercadoPagoConfig({
    accessToken: cleanToken,
    options: {
      timeout: 5000,
      idempotencyKey: crypto.randomUUID(),
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

