import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WalletLedgerService, LedgerKind } from './wallet-ledger.service';

// Mock supabase
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
};

vi.mock('@core/services/infrastructure/supabase-client.service', () => ({
  injectSupabase: () => mockSupabaseClient,
}));

describe('WalletLedgerService', () => {
  let service: WalletLedgerService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });

    TestBed.configureTestingModule({
      providers: [WalletLedgerService],
    });

    service = TestBed.inject(WalletLedgerService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('loadLedgerHistory', () => {
    it('should load ledger history for authenticated user', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          ts: new Date().toISOString(),
          user_id: 'user-123',
          kind: 'deposit',
          amount_cents: 10000,
          balance_change_cents: 10000,
          ref: 'REF-001',
          meta: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'entry-2',
          ts: new Date().toISOString(),
          user_id: 'user-123',
          kind: 'rental_charge',
          amount_cents: 5000,
          balance_change_cents: -5000,
          ref: 'REF-002',
          meta: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockEntries, error: null }),
            }),
          }),
        }),
      });

      await service.loadLedgerHistory(50);

      expect(service.ledgerHistory()).toEqual(mockEntries);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should set error when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      await service.loadLedgerHistory();

      expect(service.error()).toBe('Usuario no autenticado');
      expect(service.loading()).toBe(false);
    });

    it('should handle database error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }),
      });

      await service.loadLedgerHistory();

      expect(service.error()).toBeDefined();
      expect(service.loading()).toBe(false);
    });
  });

  describe('loadTransfers', () => {
    it('should load transfers for authenticated user', async () => {
      const mockTransfers = [
        {
          id: 'transfer-1',
          from_user: 'user-123',
          to_user: 'user-456',
          amount_cents: 5000,
          status: 'completed',
          ref: 'TRF-001',
          meta: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockTransfers, error: null }),
            }),
          }),
        }),
      });

      await service.loadTransfers(20);

      expect(service.transfers()).toEqual(mockTransfers);
      expect(service.loading()).toBe(false);
    });

    it('should set error when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      await service.loadTransfers();

      expect(service.error()).toBe('Usuario no autenticado');
    });
  });

  describe('transferFunds', () => {
    it('should transfer funds successfully', async () => {
      const mockTransferResult = {
        ok: true,
        transfer: {
          transfer_id: 'new-transfer-1',
          ref: 'TRF-NEW-001',
          status: 'completed',
          from_user: 'user-123',
          to_user: 'user-456',
          amount_cents: 3000,
        },
      };

      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: mockTransferResult,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const result = await service.transferFunds({
        to_user_id: 'user-456',
        amount_cents: 3000,
        description: 'Test transfer',
      });

      expect(result.ok).toBe(true);
      expect(result.transfer?.amount_cents).toBe(3000);
    });

    it('should handle transfer failure', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { ok: false, error: 'Insufficient funds' },
        error: null,
      });

      const result = await service.transferFunds({
        to_user_id: 'user-456',
        amount_cents: 999999999,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should handle function invoke error', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function timeout' },
      });

      const result = await service.transferFunds({
        to_user_id: 'user-456',
        amount_cents: 1000,
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('searchUserByWalletNumber', () => {
    it('should return null for invalid wallet number format', async () => {
      const result = await service.searchUserByWalletNumber('invalid');

      expect(result).toBeNull();
    });

    it('should return null for wallet number not starting with AR', async () => {
      const result = await service.searchUserByWalletNumber('US1234567890123456');

      expect(result).toBeNull();
    });

    it('should return null for wallet number with wrong length', async () => {
      const result = await service.searchUserByWalletNumber('AR12345');

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.searchUserByWalletNumber('AR0000000000000000');

      expect(result).toBeNull();
    });
  });

  describe('formatAmount', () => {
    it('should format USD amount correctly', () => {
      const result = service.formatAmount(15000, 'USD');

      expect(result).toContain('150');
    });

    it('should format ARS amount correctly', () => {
      const result = service.formatAmount(250000, 'ARS');

      expect(result).toContain('2');
    });

    it('should default to USD when no currency specified', () => {
      const result = service.formatAmount(10000);

      expect(result).toContain('100');
    });
  });

  describe('getKindLabel', () => {
    it('should return correct labels for all kinds', () => {
      expect(service.getKindLabel('deposit')).toBe('Depósito');
      expect(service.getKindLabel('transfer_out')).toBe('Transferencia enviada');
      expect(service.getKindLabel('transfer_in')).toBe('Transferencia recibida');
      expect(service.getKindLabel('rental_charge')).toBe('Cargo de reserva');
      expect(service.getKindLabel('rental_payment')).toBe('Pago de reserva');
      expect(service.getKindLabel('refund')).toBe('Reembolso');
      expect(service.getKindLabel('withdrawal')).toBe('Retiro');
      expect(service.getKindLabel('bonus')).toBe('Bonificación');
      expect(service.getKindLabel('fee')).toBe('Comisión');
    });

    it('should return kind as fallback for unknown kind', () => {
      expect(service.getKindLabel('unknown' as LedgerKind)).toBe('unknown');
    });
  });

  describe('getKindColor', () => {
    it('should return success color for positive kinds', () => {
      expect(service.getKindColor('deposit')).toContain('success');
      expect(service.getKindColor('transfer_in')).toContain('success');
      expect(service.getKindColor('rental_payment')).toContain('success');
      expect(service.getKindColor('bonus')).toContain('success');
    });

    it('should return error color for negative kinds', () => {
      expect(service.getKindColor('transfer_out')).toContain('error');
      expect(service.getKindColor('rental_charge')).toContain('error');
    });

    it('should return default color for unknown kind', () => {
      const result = service.getKindColor('unknown' as LedgerKind);
      expect(result).toContain('surface');
    });
  });

  describe('getKindIcon', () => {
    it('should return SVG path for known kinds', () => {
      expect(service.getKindIcon('deposit')).toContain('M12');
      expect(service.getKindIcon('transfer_out')).toContain('M15');
    });

    it('should return default icon for unknown kind', () => {
      const result = service.getKindIcon('unknown' as LedgerKind);
      expect(result).toContain('M13');
    });
  });
});
