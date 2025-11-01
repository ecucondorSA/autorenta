
import { describe, it, expect, vi } from 'vitest';
import mpPaymentApproved from '../../../../tests/fixtures/mp_payment_approved.json';
// Assuming handleMpWebhook is exported from the main worker file
// You might need to adjust the import path based on your actual project structure
// For this example, we'll mock the entire module where handleMpWebhook resides

// Mock the module where handleMpWebhook is defined
const mockHandleMpWebhookModule = {
  handleMpWebhook: vi.fn(),
};

// Mock the KV and repo dependencies that handleMpWebhook might use
const kv = {
  get: vi.fn(),
  put: vi.fn(),
};
const repo = {
  postLedgerEntry: vi.fn(),
  linkBookingPayment: vi.fn(),
};

describe('payments webhook idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only one ledger entry for repeated event', async () => {
    // Simulate the first call: KV does not have the key, so it will process
    kv.get.mockResolvedValueOnce(null);
    repo.postLedgerEntry.mockResolvedValueOnce({ success: true });
    repo.linkBookingPayment.mockResolvedValueOnce({ success: true });

    // Simulate the second call: KV has the key, so it will skip processing
    kv.get.mockResolvedValueOnce('seen'); // Simulate that the key is now in KV

    // First call
    await mockHandleMpWebhookModule.handleMpWebhook({ body: mpPaymentApproved, headers: { 'x-idempotency-key': String(mpPaymentApproved.data.id) } }, { kv, repo });

    // Second call with the same event
    await mockHandleMpWebhookModule.handleMpWebhook({ body: mpPaymentApproved, headers: { 'x-idempotency-key': String(mpPaymentApproved.data.id) } }, { kv, repo });

    // Expect postLedgerEntry to have been called only once
    expect(repo.postLedgerEntry).toHaveBeenCalledTimes(1);
    // Expect linkBookingPayment to have been called only once
    expect(repo.linkBookingPayment).toHaveBeenCalledTimes(1);
    // Expect kv.put to have been called once to mark the event as seen
    expect(kv.put).toHaveBeenCalledTimes(1);
  });
});
