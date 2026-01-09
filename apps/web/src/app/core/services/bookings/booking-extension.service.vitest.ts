import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingExtensionService } from './booking-extension.service';
import { BookingNotificationsService } from './booking-notifications.service';
import { BookingWalletService } from './booking-wallet.service';
import { InsuranceService } from './insurance.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import type { Booking } from '@core/models';

// Mock supabase
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('@core/services/infrastructure/supabase-client.service', () => ({
  injectSupabase: () => mockSupabaseClient,
}));

describe('BookingExtensionService', () => {
  let service: BookingExtensionService;
  let mockNotifications: { notifyExtensionRequested: ReturnType<typeof vi.fn>; notifyExtensionRejected: ReturnType<typeof vi.fn> };
  let mockWalletService: { processRentalPayment: ReturnType<typeof vi.fn> };
  let mockLogger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  // Extended type for test mocks that includes price_per_day used by the service internally
  type MockBooking = Booking & { price_per_day?: number };

  const createMockBooking = (overrides: Partial<MockBooking> = {}): MockBooking => ({
    id: 'booking-123',
    car_id: 'car-456',
    user_id: 'renter-789',
    renter_id: 'renter-789',
    owner_id: 'owner-111',
    start_at: new Date(Date.now() - 86400000).toISOString(),
    end_at: new Date(Date.now() + 86400000).toISOString(),
    status: 'in_progress',
    total_amount: 50000,
    currency: 'ARS',
    created_at: new Date().toISOString(),
    price_per_day: 10000,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockNotifications = {
      notifyExtensionRequested: vi.fn().mockResolvedValue(undefined),
      notifyExtensionRejected: vi.fn().mockResolvedValue(undefined),
    };

    mockWalletService = {
      processRentalPayment: vi.fn().mockResolvedValue({ ok: true }),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'renter-789' } },
    });

    TestBed.configureTestingModule({
      providers: [
        BookingExtensionService,
        { provide: BookingNotificationsService, useValue: mockNotifications },
        { provide: BookingWalletService, useValue: mockWalletService },
        { provide: InsuranceService, useValue: {} },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(BookingExtensionService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('requestExtension', () => {
    it('should create extension request successfully', async () => {
      const booking = createMockBooking();
      const newEndDate = new Date(Date.now() + 172800000); // 2 days from now

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'request-1' }, error: null }),
          }),
        }),
      });

      const result = await service.requestExtension(booking, newEndDate, 'Please extend');

      expect(result.success).toBe(true);
      expect(result.additionalCost).toBeGreaterThan(0);
      expect(mockNotifications.notifyExtensionRequested).toHaveBeenCalled();
    });

    it('should reject if new date is before current end date', async () => {
      const booking = createMockBooking();
      const pastDate = new Date(Date.now() - 86400000);

      const result = await service.requestExtension(booking, pastDate);

      expect(result.success).toBe(false);
      expect(result.error).toContain('posterior');
    });

    it('should reject if user is not the renter', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'other-user' } },
      });

      const booking = createMockBooking();
      const newEndDate = new Date(Date.now() + 172800000);

      const result = await service.requestExtension(booking, newEndDate);

      expect(result.success).toBe(false);
      expect(result.error).toContain('arrendatario');
    });

    it('should calculate additional cost correctly', async () => {
      const booking = createMockBooking({ price_per_day: 5000 });
      const newEndDate = new Date(new Date(booking.end_at).getTime() + 3 * 86400000); // 3 days

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'request-2' }, error: null }),
          }),
        }),
      });

      const result = await service.requestExtension(booking, newEndDate);

      expect(result.success).toBe(true);
      expect(result.additionalCost).toBe(15000); // 3 days * 5000
    });
  });

  describe('approveExtensionRequest', () => {
    it('should approve extension request successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'owner-111' } },
      });

      const booking = createMockBooking();
      const mockRequest = {
        id: 'request-1',
        request_status: 'pending',
        estimated_cost_amount: 20000,
        estimated_cost_currency: 'ARS',
        new_end_at: new Date(Date.now() + 259200000).toISOString(),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        });

      const updateCallback = vi.fn().mockResolvedValue(booking);

      const result = await service.approveExtensionRequest(
        'request-1',
        booking,
        'Approved',
        updateCallback,
      );

      expect(result.success).toBe(true);
      expect(mockWalletService.processRentalPayment).toHaveBeenCalled();
    });

    it('should reject if request not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'owner-111' } },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const result = await service.approveExtensionRequest(
        'non-existent',
        createMockBooking(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('no encontrada');
    });

    it('should reject if user is not the owner', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'wrong-user' } },
      });

      const mockRequest = {
        id: 'request-1',
        request_status: 'pending',
        estimated_cost_amount: 20000,
        estimated_cost_currency: 'ARS',
        new_end_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
          }),
        }),
      });

      const result = await service.approveExtensionRequest('request-1', createMockBooking());

      expect(result.success).toBe(false);
      expect(result.error).toContain('propietario');
    });

    it('should reject if request is not pending', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'owner-111' } },
      });

      const mockRequest = {
        id: 'request-1',
        request_status: 'approved',
        estimated_cost_amount: 20000,
        estimated_cost_currency: 'ARS',
        new_end_at: new Date().toISOString(),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
          }),
        }),
      });

      const result = await service.approveExtensionRequest('request-1', createMockBooking());

      expect(result.success).toBe(false);
      expect(result.error).toContain('pendiente');
    });
  });

  describe('rejectExtensionRequest', () => {
    it('should reject extension request successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'owner-111' } },
      });

      const mockRequest = {
        id: 'request-1',
        request_status: 'pending',
      };

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

      const result = await service.rejectExtensionRequest(
        'request-1',
        createMockBooking(),
        'Car not available',
      );

      expect(result.success).toBe(true);
      expect(mockNotifications.notifyExtensionRejected).toHaveBeenCalled();
    });
  });

  describe('getPendingExtensionRequests', () => {
    it('should return pending requests for booking', async () => {
      const mockRequests = [
        { id: 'request-1', request_status: 'pending' },
        { id: 'request-2', request_status: 'pending' },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getPendingExtensionRequests('booking-123');

      expect(result).toHaveLength(2);
    });

    it('should throw on database error', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }),
      });

      await expect(service.getPendingExtensionRequests('booking-123')).rejects.toThrow();
    });
  });

  describe('estimateExtensionCost', () => {
    it('should calculate extension cost correctly', async () => {
      const booking = createMockBooking({
        price_per_day: 8000,
        end_at: new Date(Date.now()).toISOString(),
      });
      const newEndDate = new Date(Date.now() + 5 * 86400000); // 5 days from now

      const result = await service.estimateExtensionCost(booking, newEndDate);

      expect(result.amount).toBe(40000); // 5 days * 8000
      expect(result.currency).toBe('ARS');
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid date', async () => {
      const booking = createMockBooking();
      const pastDate = new Date(Date.now() - 86400000);

      const result = await service.estimateExtensionCost(booking, pastDate);

      expect(result.amount).toBe(0);
      expect(result.error).toContain('posterior');
    });
  });

  describe('extendInsuranceCoverageIfNeeded', () => {
    it('should extend insurance coverage', async () => {
      const mockCoverage = { id: 'coverage-1', coverage_end: new Date().toISOString() };

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockCoverage, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

      await service.extendInsuranceCoverageIfNeeded(
        'booking-123',
        new Date(Date.now() + 86400000).toISOString(),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Insurance coverage extended',
        'BookingExtensionService',
        expect.any(Object),
      );
    });

    it('should handle missing coverage gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      await service.extendInsuranceCoverageIfNeeded(
        'booking-123',
        new Date().toISOString(),
      );

      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });
});
