/**
 * Tests for mercadopago-webhook Edge Function
 *
 * These tests verify the webhook helper functions from the shared module.
 * The actual webhook handler (index.ts) is FROZEN and uses its own copies,
 * but these functions are semantically equivalent.
 *
 * Run with:
 *   deno test --allow-env --allow-net supabase/functions/mercadopago-webhook/index.test.ts
 *
 * Or from project root:
 *   cd supabase/functions && deno test --allow-env --allow-net
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Import REAL functions from shared module
import {
  ipToNumber,
  isMercadoPagoIP,
  timingSafeEqualHex,
  parseSignatureHeader,
  buildHMACManifest,
  calculateHMAC,
  validateWebhookSignature,
  validateAmount,
  cleanToken,
  shouldCreditWallet,
  isPreauthorization,
  isTerminalStatus,
  parseSubscriptionReference,
  MERCADOPAGO_IP_RANGES,
  type MPWebhookPayload,
  type MPPayment,
} from '../_shared/webhook-helpers.ts';

// ========================================
// IP VALIDATION TESTS
// ========================================

Deno.test('ipToNumber converts IPv4 correctly', () => {
  assertEquals(ipToNumber('0.0.0.0'), 0);
  assertEquals(ipToNumber('0.0.0.1'), 1);
  assertEquals(ipToNumber('0.0.1.0'), 256);
  assertEquals(ipToNumber('0.1.0.0'), 65536);
  assertEquals(ipToNumber('1.0.0.0'), 16777216);
  assertEquals(ipToNumber('255.255.255.255'), 4294967295);
  assertEquals(ipToNumber('192.168.1.1'), 3232235777);
  assertEquals(ipToNumber('209.225.49.0'), 3521736960);
});

Deno.test('MERCADOPAGO_IP_RANGES are defined correctly', () => {
  assertEquals(MERCADOPAGO_IP_RANGES.length, 3);

  // First range: 209.225.49.0/24
  assertEquals(MERCADOPAGO_IP_RANGES[0].start, ipToNumber('209.225.49.0'));
  assertEquals(MERCADOPAGO_IP_RANGES[0].end, ipToNumber('209.225.49.255'));

  // Second range: 216.33.197.0/24
  assertEquals(MERCADOPAGO_IP_RANGES[1].start, ipToNumber('216.33.197.0'));
  assertEquals(MERCADOPAGO_IP_RANGES[1].end, ipToNumber('216.33.197.255'));

  // Third range: 216.33.196.0/24
  assertEquals(MERCADOPAGO_IP_RANGES[2].start, ipToNumber('216.33.196.0'));
  assertEquals(MERCADOPAGO_IP_RANGES[2].end, ipToNumber('216.33.196.255'));
});

Deno.test('isMercadoPagoIP validates IP ranges correctly', () => {
  // Valid MercadoPago IPs
  assertEquals(isMercadoPagoIP('209.225.49.0'), true);
  assertEquals(isMercadoPagoIP('209.225.49.128'), true);
  assertEquals(isMercadoPagoIP('209.225.49.255'), true);
  assertEquals(isMercadoPagoIP('216.33.197.1'), true);
  assertEquals(isMercadoPagoIP('216.33.196.100'), true);

  // Invalid IPs
  assertEquals(isMercadoPagoIP('192.168.1.1'), false);
  assertEquals(isMercadoPagoIP('8.8.8.8'), false);
  assertEquals(isMercadoPagoIP('209.225.48.255'), false); // Just outside range
  assertEquals(isMercadoPagoIP('209.225.50.0'), false); // Just outside range

  // Empty IP (should return true to let HMAC validate)
  assertEquals(isMercadoPagoIP(''), true);

  // IP from proxy header (comma-separated) - takes first IP
  assertEquals(isMercadoPagoIP('209.225.49.100, 10.0.0.1'), true);
  assertEquals(isMercadoPagoIP('192.168.1.1, 209.225.49.100'), false);
});

// ========================================
// HMAC VALIDATION TESTS
// ========================================

Deno.test('timingSafeEqualHex compares hex strings securely', () => {
  // Matching hex strings
  assertEquals(timingSafeEqualHex('abcd1234', 'abcd1234'), true);
  assertEquals(timingSafeEqualHex('00ff00ff', '00ff00ff'), true);

  // Non-matching hex strings
  assertEquals(timingSafeEqualHex('abcd1234', 'abcd1235'), false);
  assertEquals(timingSafeEqualHex('00ff00ff', '00ff00fe'), false);

  // Different lengths
  assertEquals(timingSafeEqualHex('abcd', 'abcd12'), false);

  // Empty/null values
  assertEquals(timingSafeEqualHex('', 'abcd'), false);
  assertEquals(timingSafeEqualHex('abcd', ''), false);

  // Odd length (invalid hex)
  assertEquals(timingSafeEqualHex('abc', 'abc'), false);

  // Case sensitivity (should work with lowercase)
  assertEquals(timingSafeEqualHex('abcd', 'abcd'), true);
});

Deno.test('parseSignatureHeader parses x-signature correctly', () => {
  // Valid signature
  const validSig = 'ts=1704900000,v1=abc123def456789';
  const parsed = parseSignatureHeader(validSig);
  assertEquals(parsed.ts, '1704900000');
  assertEquals(parsed.v1, 'abc123def456789');

  // Signature with spaces
  const spacedSig = 'ts = 1704900000 , v1 = abc123';
  const parsedSpaced = parseSignatureHeader(spacedSig);
  assertEquals(parsedSpaced.ts, '1704900000');
  assertEquals(parsedSpaced.v1, 'abc123');

  // Missing v1
  const missingV1 = 'ts=1704900000';
  const parsedMissing = parseSignatureHeader(missingV1);
  assertEquals(parsedMissing.ts, '1704900000');
  assertEquals(parsedMissing.v1, undefined);

  // Empty string
  const empty = parseSignatureHeader('');
  assertEquals(empty.ts, undefined);
  assertEquals(empty.v1, undefined);
});

Deno.test('buildHMACManifest creates correct format', () => {
  const manifest = buildHMACManifest('12345678', 'request-id-abc', '1704900000');
  assertEquals(manifest, 'id:12345678;request-id:request-id-abc;ts:1704900000;');
});

Deno.test('calculateHMAC produces valid SHA-256 hash', async () => {
  const message = 'id:123;request-id:abc;ts:1704900000;';
  const secret = 'TEST_SECRET_KEY';

  const hash = await calculateHMAC(message, secret);

  // Verify hash is 64 chars (SHA-256 hex)
  assertEquals(hash.length, 64);
  assertExists(hash.match(/^[a-f0-9]+$/));

  // Same input should produce same output
  const hash2 = await calculateHMAC(message, secret);
  assertEquals(hash, hash2);

  // Different input should produce different output
  const hash3 = await calculateHMAC(message + 'x', secret);
  assertEquals(hash3.length, 64);
  assertEquals(hash === hash3, false);
});

Deno.test('validateWebhookSignature validates correctly', async () => {
  const accessToken = 'TEST_ACCESS_TOKEN_12345';
  const paymentId = '12345678';
  const requestId = 'request-id-abc123';
  const timestamp = '1704900000';

  // Calculate expected signature
  const manifest = buildHMACManifest(paymentId, requestId, timestamp);
  const expectedHash = await calculateHMAC(manifest, accessToken);

  // Valid signature
  const validSignature = `ts=${timestamp},v1=${expectedHash}`;
  const validResult = await validateWebhookSignature(
    validSignature,
    requestId,
    paymentId,
    accessToken
  );
  assertEquals(validResult.valid, true);
  assertEquals(validResult.error, undefined);

  // Invalid signature
  const invalidSignature = `ts=${timestamp},v1=wronghash1234567890123456789012345678901234567890123456789012`;
  const invalidResult = await validateWebhookSignature(
    invalidSignature,
    requestId,
    paymentId,
    accessToken
  );
  assertEquals(invalidResult.valid, false);
  assertStringIncludes(invalidResult.error!, 'HMAC mismatch');

  // Missing ts
  const missingTs = `v1=${expectedHash}`;
  const missingTsResult = await validateWebhookSignature(
    missingTs,
    requestId,
    paymentId,
    accessToken
  );
  assertEquals(missingTsResult.valid, false);
  assertStringIncludes(missingTsResult.error!, 'Missing ts');
});

// ========================================
// AMOUNT VALIDATION TESTS
// ========================================

Deno.test('validateAmount validates with tolerance', () => {
  // Exact match
  const exact = validateAmount(10000, 100.0);
  assertEquals(exact.valid, true);
  assertEquals(exact.receivedCents, 10000);
  assertEquals(exact.diffCents, 0);

  // Within tolerance (rounding)
  const roundUp = validateAmount(10000, 100.005);
  assertEquals(roundUp.valid, true);
  assertEquals(roundUp.receivedCents, 10001);
  assertEquals(roundUp.diffCents, 1);

  const roundDown = validateAmount(10000, 99.995);
  assertEquals(roundDown.valid, true);
  assertEquals(roundDown.receivedCents, 10000); // rounds to 10000
  assertEquals(roundDown.diffCents, 0);

  // Outside tolerance
  const tooHigh = validateAmount(10000, 100.02);
  assertEquals(tooHigh.valid, false);
  assertEquals(tooHigh.receivedCents, 10002);
  assertEquals(tooHigh.diffCents, 2);

  const tooLow = validateAmount(10000, 99.98);
  assertEquals(tooLow.valid, false);
  assertEquals(tooLow.receivedCents, 9998);
  assertEquals(tooLow.diffCents, 2);

  // Way off
  const wayOff = validateAmount(10000, 50.0);
  assertEquals(wayOff.valid, false);
  assertEquals(wayOff.receivedCents, 5000);
  assertEquals(wayOff.diffCents, 5000);

  // Custom tolerance
  const customTolerance = validateAmount(10000, 100.05, 10);
  assertEquals(customTolerance.valid, true);
  assertEquals(customTolerance.diffCents, 5);
});

// ========================================
// TOKEN UTILITIES TESTS
// ========================================

Deno.test('cleanToken removes whitespace correctly', () => {
  assertEquals(cleanToken('  TOKEN123  '), 'TOKEN123');
  assertEquals(cleanToken('TOKEN\n123'), 'TOKEN123');
  assertEquals(cleanToken('TOKEN\r\n123\t'), 'TOKEN123');
  assertEquals(cleanToken('  TO KEN 12 3  '), 'TOKEN123');
  assertEquals(cleanToken('TOKEN123'), 'TOKEN123');
});

// ========================================
// PAYMENT STATUS TESTS
// ========================================

Deno.test('shouldCreditWallet only returns true for approved', () => {
  assertEquals(shouldCreditWallet('approved'), true);
  assertEquals(shouldCreditWallet('pending'), false);
  assertEquals(shouldCreditWallet('in_process'), false);
  assertEquals(shouldCreditWallet('rejected'), false);
  assertEquals(shouldCreditWallet('cancelled'), false);
  assertEquals(shouldCreditWallet('refunded'), false);
  assertEquals(shouldCreditWallet('charged_back'), false);
  assertEquals(shouldCreditWallet('authorized'), false);
});

Deno.test('isPreauthorization identifies authorized status', () => {
  assertEquals(isPreauthorization('authorized'), true);
  assertEquals(isPreauthorization('approved'), false);
  assertEquals(isPreauthorization('pending'), false);
});

Deno.test('isTerminalStatus identifies final statuses', () => {
  assertEquals(isTerminalStatus('approved'), true);
  assertEquals(isTerminalStatus('rejected'), true);
  assertEquals(isTerminalStatus('cancelled'), true);
  assertEquals(isTerminalStatus('refunded'), true);
  assertEquals(isTerminalStatus('charged_back'), true);

  assertEquals(isTerminalStatus('pending'), false);
  assertEquals(isTerminalStatus('in_process'), false);
  assertEquals(isTerminalStatus('authorized'), false);
});

// ========================================
// EXTERNAL REFERENCE PARSING TESTS
// ========================================

Deno.test('parseSubscriptionReference parses correctly', () => {
  // Valid subscription reference
  const valid = parseSubscriptionReference('subscription_user123_club_standard_1704900000');
  assertEquals(valid.isSubscription, true);
  assertEquals(valid.userId, 'user123');
  assertEquals(valid.tier, 'club');
  // timestamp includes everything after tier (may have underscores)
  assertExists(valid.timestamp);

  // Not a subscription
  const notSub = parseSubscriptionReference('booking_123');
  assertEquals(notSub.isSubscription, false);
  assertEquals(notSub.userId, undefined);

  // Malformed subscription (missing parts)
  const malformed = parseSubscriptionReference('subscription_');
  assertEquals(malformed.isSubscription, true);
  assertEquals(malformed.userId, undefined);

  // UUID as booking reference
  const uuid = parseSubscriptionReference('550e8400-e29b-41d4-a716-446655440000');
  assertEquals(uuid.isSubscription, false);
});

// ========================================
// TYPE TESTS
// ========================================

Deno.test('MPWebhookPayload type structure', () => {
  const payload: MPWebhookPayload = {
    id: 12345,
    live_mode: true,
    type: 'payment',
    date_created: '2026-01-29T10:00:00Z',
    user_id: 67890,
    api_version: 'v1',
    action: 'payment.created',
    data: { id: '111222333' },
  };

  assertEquals(payload.type, 'payment');
  assertEquals(typeof payload.id, 'number');
  assertEquals(typeof payload.live_mode, 'boolean');
  assertExists(payload.data.id);
});

Deno.test('MPPayment type structure', () => {
  const payment: MPPayment = {
    id: '12345',
    status: 'approved',
    transaction_amount: 100.0,
    currency_id: 'ARS',
    external_reference: 'booking-uuid-here',
  };

  assertEquals(payment.status, 'approved');
  assertEquals(payment.transaction_amount, 100.0);
  assertEquals(payment.currency_id, 'ARS');
});

// ========================================
// EDGE CASES
// ========================================

Deno.test('handles edge case IPs correctly', () => {
  // Boundary IPs
  assertEquals(isMercadoPagoIP('209.225.49.0'), true); // Start of range
  assertEquals(isMercadoPagoIP('209.225.49.255'), true); // End of range
  assertEquals(isMercadoPagoIP('209.225.48.255'), false); // One before start
  assertEquals(isMercadoPagoIP('209.225.50.0'), false); // One after end
});

Deno.test('handles malformed input gracefully', () => {
  // IP edge cases
  assertEquals(isMercadoPagoIP('not.an.ip.address'), false);
  assertEquals(isMercadoPagoIP('999.999.999.999'), false);

  // Signature edge cases
  const emptyParts = parseSignatureHeader(',,,');
  assertEquals(emptyParts.ts, undefined);
  assertEquals(emptyParts.v1, undefined);
});

console.log('✅ All mercadopago-webhook tests completed!');
