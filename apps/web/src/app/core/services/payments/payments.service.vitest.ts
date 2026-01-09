import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import { FxService } from './fx.service';

// Mock supabase
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@core/services/infrastructure/supabase-client.service', () => ({
  injectSupabase: () => mockSupabaseClient,
}));

vi.mock('@environment', () => ({
  environment: {
    production: false,
    paymentsWebhookUrl: 'http://localhost:8787/webhook',
  },
}));

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockFxService: { getCurrentRateAsync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFxService = {
      getCurrentRateAsync: vi.fn().mockResolvedValue(1000), // 1 USD = 1000 ARS
    };

    TestBed.configureTestingModule({
      providers: [
        PaymentsService,
        { provide: FxService, useValue: mockFxService },
      ],
    });

    service = TestBed.inject(PaymentsService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('createIntent', () => {
    it('should create payment intent from booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        total_amount: 50000,
        currency: 'ARS',
        renter_id: 'user-456',
      };

      const mockIntent = {
        id: 'intent-789',
        provider: 'mercadopago',
        status: 'pending',
        created_at: new Date().toISOString(),
        booking_id: 'booking-123',
        amount_usd: 50,
        amount_ars: 50000,
        fx_rate: 1000,
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIntent, error: null }),
          }),
        }),
      });

      const result = await service.createIntent('booking-123');

      expect(result).toEqual(mockIntent);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bookings');
    });

    it('should throw error when booking not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      await expect(service.createIntent('invalid-id')).rejects.toThrow('Booking no encontrado');
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with USD amount', async () => {
      const mockIntent = {
        id: 'intent-new',
        provider: 'mercadopago',
        status: 'pending',
        created_at: new Date().toISOString(),
        amount_usd: 100,
        amount_ars: 100000,
        fx_rate: 1000,
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIntent, error: null }),
          }),
        }),
      });

      const result = await service.createPaymentIntent({
        bookingId: 'booking-1',
        userId: 'user-1',
        amount: 100,
        currency: 'USD',
        intentType: 'booking',
        description: 'Test payment',
      });

      expect(result).toEqual(mockIntent);
      expect(mockFxService.getCurrentRateAsync).toHaveBeenCalledWith('USD', 'ARS');
    });

    it('should create payment intent with ARS amount', async () => {
      const mockIntent = {
        id: 'intent-ars',
        provider: 'mercadopago',
        status: 'pending',
        created_at: new Date().toISOString(),
        amount_usd: 50,
        amount_ars: 50000,
        fx_rate: 1000,
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIntent, error: null }),
          }),
        }),
      });

      const result = await service.createPaymentIntent({
        amount: 50000,
        currency: 'ARS',
        intentType: 'security_deposit',
      });

      expect(result.amount_ars).toBe(50000);
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        service.createPaymentIntent({
          amount: 0,
          currency: 'USD',
          intentType: 'booking',
        }),
      ).rejects.toThrow('Monto inválido');
    });

    it('should throw error for negative amount', async () => {
      await expect(
        service.createPaymentIntent({
          amount: -100,
          currency: 'USD',
          intentType: 'booking',
        }),
      ).rejects.toThrow('Monto inválido');
    });

    it('should throw error when FX rate unavailable', async () => {
      mockFxService.getCurrentRateAsync.mockResolvedValue(0);

      await expect(
        service.createPaymentIntent({
          amount: 100,
          currency: 'USD',
          intentType: 'booking',
        }),
      ).rejects.toThrow('No se pudo obtener la tasa de cambio');
    });

    it('should handle string overload (bookingId)', async () => {
      const mockBooking = {
        id: 'booking-overload',
        total_amount: 25000,
        currency: 'ARS',
        renter_id: 'user-overload',
      };

      const mockIntent = {
        id: 'intent-overload',
        provider: 'mercadopago',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIntent, error: null }),
          }),
        }),
      });

      const result = await service.createPaymentIntent('booking-overload');

      expect(result).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return payment intent status', async () => {
      const mockIntent = {
        id: 'intent-status',
        provider: 'mercadopago',
        status: 'completed',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIntent, error: null }),
          }),
        }),
      });

      const result = await service.getStatus('intent-status');

      expect(result?.status).toBe('completed');
    });

    it('should return null when intent not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await service.getStatus('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createMpPreAuthOrder', () => {
    it('should create MercadoPago pre-auth order', async () => {
      const mockResult = {
        id: 'intent-preauth',
        provider: 'mercadopago',
        status: 'authorized',
        created_at: new Date().toISOString(),
        mp_order_id: 'mp-order-123',
      };

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockResult, error: null });

      const result = await service.createMpPreAuthOrder(
        'intent-1',
        5000000,
        'Security deposit',
        'booking-1',
      );

      expect(result.mp_order_id).toBe('mp-order-123');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_mp_preauth_order', {
        p_intent_id: 'intent-1',
        p_amount_cents: 5000000,
        p_description: 'Security deposit',
        p_booking_id: 'booking-1',
      });
    });

    it('should throw error on RPC failure', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      await expect(
        service.createMpPreAuthOrder('intent-1', 5000000, 'Test'),
      ).rejects.toThrow('RPC failed');
    });
  });

  describe('captureMpPreAuth', () => {
    it('should capture MercadoPago pre-auth', async () => {
      const mockResult = {
        id: 'intent-captured',
        provider: 'mercadopago',
        status: 'captured',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockResult, error: null });

      const result = await service.captureMpPreAuth('mp-order-123', 3000000, 'Capture for damages');

      expect(result.status).toBe('captured');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('capture_mp_preauth_order', {
        p_mp_order_id: 'mp-order-123',
        p_amount_cents: 3000000,
        p_description: 'Capture for damages',
      });
    });
  });

  describe('releaseMpPreAuth', () => {
    it('should release MercadoPago pre-auth', async () => {
      const mockResult = {
        id: 'intent-released',
        provider: 'mercadopago',
        status: 'cancelled',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockResult, error: null });

      const result = await service.releaseMpPreAuth('mp-order-456', 'No damages found');

      expect(result.status).toBe('cancelled');
    });
  });

  describe('cancelMpPreAuth', () => {
    it('should cancel (release) MercadoPago pre-auth', async () => {
      const mockResult = {
        id: 'intent-cancelled',
        provider: 'mercadopago',
        status: 'cancelled',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.rpc.mockResolvedValue({ data: mockResult, error: null });

      const result = await service.cancelMpPreAuth('mp-order-789', 'Booking cancelled');

      expect(result.status).toBe('cancelled');
    });
  });

  describe('createPaymentIntentWithDetails', () => {
    it('should create intent with wallet provider', async () => {
      const mockIntent = {
        id: 'intent-wallet',
        provider: 'wallet',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIntent, error: null }),
          }),
        }),
      });

      const result = await service.createPaymentIntentWithDetails({
        booking_id: 'booking-wallet',
        payment_method: 'wallet',
        amount_cents: 1000000,
        status: 'pending',
      });

      expect(result.provider).toBe('wallet');
    });

    it('should create intent with mercadopago provider', async () => {
      const mockIntent = {
        id: 'intent-mp',
        provider: 'mercadopago',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIntent, error: null }),
          }),
        }),
      });

      const result = await service.createPaymentIntentWithDetails({
        booking_id: 'booking-mp',
        payment_method: 'card',
        amount_cents: 2000000,
        status: 'pending',
      });

      expect(result.provider).toBe('mercadopago');
    });
  });
});
