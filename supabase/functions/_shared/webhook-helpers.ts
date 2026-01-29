/**
 * Webhook Helper Functions
 *
 * Shared utilities for webhook processing that can be tested independently.
 * These functions are used by mercadopago-webhook and other webhook handlers.
 *
 * NOTE: mercadopago-webhook/index.ts is FROZEN and contains its own copies
 * of these functions. This module exists for:
 * 1. Testing - tests import from here instead of copying inline
 * 2. New webhooks - new handlers should import from here
 * 3. Future refactor - when mercadopago-webhook is unfrozen, migrate to use this
 */

// ============================================
// IP VALIDATION
// ============================================

/**
 * MercadoPago authorized IP ranges
 * Source: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/ipn
 */
export const MERCADOPAGO_IP_RANGES = [
  // Rango 1: 209.225.49.0/24
  { start: ipToNumber('209.225.49.0'), end: ipToNumber('209.225.49.255') },
  // Rango 2: 216.33.197.0/24
  { start: ipToNumber('216.33.197.0'), end: ipToNumber('216.33.197.255') },
  // Rango 3: 216.33.196.0/24
  { start: ipToNumber('216.33.196.0'), end: ipToNumber('216.33.196.255') },
];

/**
 * Converts an IPv4 address to a numeric value for range comparison
 */
export function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3];
}

/**
 * Validates if an IP address is within MercadoPago's authorized ranges
 * Returns true if:
 * - IP is empty (will rely on HMAC validation)
 * - IP is within any authorized range
 */
export function isMercadoPagoIP(clientIP: string): boolean {
  // If no IP in headers (proxy), allow and let HMAC validate
  if (!clientIP) {
    return true;
  }

  // Extract first IP from header (may come as "IP, IP, IP" from proxy chain)
  const ip = clientIP.split(',')[0].trim();
  const ipNum = ipToNumber(ip);

  // Check if within any authorized range
  return MERCADOPAGO_IP_RANGES.some((range) => ipNum >= range.start && ipNum <= range.end);
}

// ============================================
// HMAC VALIDATION
// ============================================

/**
 * Timing-safe comparison for hex strings
 * Prevents timing attacks by ensuring constant-time comparison
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  // Length must be even (each byte = 2 hex chars)
  if (a.length % 2 !== 0 || b.length % 2 !== 0) return false;
  if (a.length !== b.length) return false;

  const len = a.length / 2;
  const aBuf = new Uint8Array(len);
  const bBuf = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    aBuf[i] = parseInt(a.substr(i * 2, 2), 16) || 0;
    bBuf[i] = parseInt(b.substr(i * 2, 2), 16) || 0;
  }

  let result = 0;
  for (let i = 0; i < len; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}

/**
 * Parses MercadoPago x-signature header
 * Format: "ts=1704900000,v1=abc123def456..."
 */
export function parseSignatureHeader(xSignature: string): { ts?: string; v1?: string } {
  const parts: Record<string, string> = {};

  xSignature.split(',').forEach((part: string) => {
    const [key, value] = (part || '').split('=');
    if (key && value) {
      parts[key.trim()] = value.trim();
    }
  });

  return {
    ts: parts['ts'],
    v1: parts['v1'],
  };
}

/**
 * Builds the HMAC manifest string for MercadoPago webhook validation
 * Format: "id:{payment_id};request-id:{request_id};ts:{timestamp};"
 */
export function buildHMACManifest(paymentId: string, requestId: string, timestamp: string): string {
  return `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
}

/**
 * Calculates HMAC-SHA256 signature for webhook validation
 */
export async function calculateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));

  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates MercadoPago webhook HMAC signature
 */
export async function validateWebhookSignature(
  xSignature: string,
  xRequestId: string,
  paymentId: string,
  accessToken: string
): Promise<{ valid: boolean; error?: string }> {
  const { ts, v1: receivedHash } = parseSignatureHeader(xSignature);

  if (!ts || !receivedHash) {
    return { valid: false, error: 'Missing ts or v1 in signature' };
  }

  const manifest = buildHMACManifest(paymentId, xRequestId, ts);
  const calculatedHash = await calculateHMAC(manifest, accessToken);

  if (!timingSafeEqualHex(calculatedHash.toLowerCase(), receivedHash.toLowerCase())) {
    return { valid: false, error: 'HMAC mismatch' };
  }

  return { valid: true };
}

// ============================================
// AMOUNT VALIDATION
// ============================================

/**
 * Validates payment amount with tolerance for rounding
 * @param expectedCents Expected amount in cents
 * @param receivedAmount Received amount (may be in decimal format)
 * @param toleranceCents Allowed difference (default 1 cent)
 */
export function validateAmount(
  expectedCents: number,
  receivedAmount: number,
  toleranceCents: number = 1
): { valid: boolean; receivedCents: number; diffCents: number } {
  const receivedCents = Math.round(receivedAmount * 100);
  const diffCents = Math.abs(expectedCents - receivedCents);

  return {
    valid: diffCents <= toleranceCents,
    receivedCents,
    diffCents,
  };
}

// ============================================
// TOKEN UTILITIES
// ============================================

/**
 * Cleans access token by removing whitespace and line breaks
 * Tokens from environment variables may have trailing newlines
 */
export function cleanToken(rawToken: string): string {
  return rawToken.trim().replace(/[\r\n\t\s]/g, '');
}

// ============================================
// PAYMENT STATUS HANDLING
// ============================================

/**
 * Valid MercadoPago payment statuses
 */
export const MP_PAYMENT_STATUSES = [
  'approved',
  'pending',
  'in_process',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
  'authorized',
] as const;

export type MPPaymentStatus = (typeof MP_PAYMENT_STATUSES)[number];

/**
 * Checks if a payment status should trigger wallet credit
 */
export function shouldCreditWallet(status: string): boolean {
  return status === 'approved';
}

/**
 * Checks if a payment status indicates a preauthorization hold
 */
export function isPreauthorization(status: string): boolean {
  return status === 'authorized';
}

/**
 * Checks if a payment status is terminal (no more changes expected)
 */
export function isTerminalStatus(status: string): boolean {
  return ['approved', 'rejected', 'cancelled', 'refunded', 'charged_back'].includes(status);
}

// ============================================
// EXTERNAL REFERENCE PARSING
// ============================================

/**
 * Parses subscription external_reference
 * Format: "subscription_{user_id}_{tier}_{timestamp}"
 */
export function parseSubscriptionReference(ref: string): {
  isSubscription: boolean;
  userId?: string;
  tier?: string;
  timestamp?: string;
} {
  if (!ref.startsWith('subscription_')) {
    return { isSubscription: false };
  }

  const parts = ref.split('_');
  if (parts.length < 4) {
    return { isSubscription: true }; // Malformed but is subscription
  }

  return {
    isSubscription: true,
    userId: parts[1],
    tier: parts[2],
    timestamp: parts.slice(3).join('_'),
  };
}

// ============================================
// WEBHOOK PAYLOAD TYPES
// ============================================

export interface MPWebhookPayload {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  user_id: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

export interface MPPayment {
  id: string | number;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  currency_id?: string;
  payment_method_id?: string;
  operation_type?: string;
  card?: { last_four_digits?: string } | null;
  external_reference?: string | null;
  metadata?: Record<string, unknown> | null;
  collector_id?: string | number | null;
  marketplace_fee?: number | null;
  date_approved?: string | null;
  payment_type_id?: string;
  transaction_details?: { net_received_amount?: number } | null;
  date_created?: string | null;
  payer?: { email?: string; first_name?: string; last_name?: string } | null;
}
