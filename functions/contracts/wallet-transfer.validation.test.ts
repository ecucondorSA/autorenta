import { describe, it, expect } from 'vitest';
import { transferRequestSchema, transferResponseSchema } from './wallet-transfer.contracts';

const uuid = () => crypto.randomUUID();

describe('Wallet transfer contracts', () => {
  it('accepts a valid transfer request with memo', () => {
    const payload = {
      source_account_id: uuid(),
      target_account_id: uuid(),
      amount_cents: 125_00,
      memo: 'Reintegro por peaje',
    };

    expect(() => transferRequestSchema.parse(payload)).not.toThrow();
  });

  it('accepts a valid transfer request without memo', () => {
    const payload = {
      source_account_id: uuid(),
      target_account_id: uuid(),
      amount_cents: 9900,
    };

    expect(() => transferRequestSchema.parse(payload)).not.toThrow();
  });

  it('rejects transfers where source and target are the same', () => {
    const accountId = uuid();
    const payload = {
      source_account_id: accountId,
      target_account_id: accountId,
      amount_cents: 5000,
    };

    expect(() => transferRequestSchema.parse(payload)).toThrow();
  });

  it('rejects non-positive transfer amounts', () => {
    const payload = {
      source_account_id: uuid(),
      target_account_id: uuid(),
      amount_cents: 0,
    };

    expect(() => transferRequestSchema.parse(payload)).toThrow();
  });

  it('rejects amounts over the configured limit', () => {
    const payload = {
      source_account_id: uuid(),
      target_account_id: uuid(),
      amount_cents: 10_000_000_01,
    };

    expect(() => transferRequestSchema.parse(payload)).toThrow();
  });

  it('accepts the maximum allowed amount', () => {
    const payload = {
      source_account_id: uuid(),
      target_account_id: uuid(),
      amount_cents: 10_000_000_00,
    };

    expect(() => transferRequestSchema.parse(payload)).not.toThrow();
  });

  it('rejects invalid UUIDs in transfer requests', () => {
    const payload = {
      source_account_id: 'not-a-uuid',
      target_account_id: uuid(),
      amount_cents: 1200,
    };

    expect(() => transferRequestSchema.parse(payload)).toThrow();
  });

  it('accepts a response with posted status', () => {
    const payload = {
      transfer_id: uuid(),
      status: 'posted',
      created_at: new Date().toISOString(),
    };

    expect(() => transferResponseSchema.parse(payload)).not.toThrow();
  });

  it('rejects responses with unsupported status values', () => {
    const payload = {
      transfer_id: uuid(),
      status: 'failed',
      created_at: new Date().toISOString(),
    };

    expect(() => transferResponseSchema.parse(payload)).toThrow();
  });

  it('rejects responses with invalid created_at', () => {
    const payload = {
      transfer_id: uuid(),
      status: 'pending',
      created_at: 'not-a-date',
    };

    expect(() => transferResponseSchema.parse(payload)).toThrow();
  });
});
