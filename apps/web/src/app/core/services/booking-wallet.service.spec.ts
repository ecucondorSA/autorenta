import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BookingWalletService } from './booking-wallet.service';
import { SupabaseClientService } from './supabase-client.service';
import { WalletService } from './wallet.service';
import { LoggerService } from './logger.service';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';
import { CarsService } from './cars.service';
import { Booking } from '../models';
import { WalletLockFundsResponse, WalletUnlockFundsResponse } from '../models/wallet.model';

// Helper to create chainable Supabase mock queries
function createMockQuery(finalResponse: { data: unknown; error: unknown }): Record<string, any> {
  const query: Record<string, any> = {};
  query['select'] = jasmine.createSpy('select').and.callFake(() => query);
  query['eq'] = jasmine.createSpy('eq').and.callFake(() => query);
  query['insert'] = jasmine.createSpy('insert').and.returnValue(Promise.resolve(finalResponse));
  query['single'] = jasmine.createSpy('single').and.returnValue(Promise.resolve(finalResponse));
  return query;
}

describe('BookingWalletService', () => {
  let service: BookingWalletService;
  let mockSupabaseClient: any;
  let mockWalletService: jasmine.SpyObj<WalletService>;
  let mockLoggerService: jasmine.SpyObj<LoggerService>;
  let mockCarOwnerNotifications: jasmine.SpyObj<CarOwnerNotificationsService>;
  let mockCarsService: jasmine.SpyObj<CarsService>;

  const mockBooking: Booking = {
    id: 'booking-123',
    car_id: 'car-456',
    user_id: 'user-789',
    renter_id: 'user-789',
    owner_id: 'owner-001',
    status: 'confirmed',
    wallet_status: 'locked',
    wallet_lock_transaction_id: 'tx-001',
    start_at: '2025-12-01T10:00:00Z',
    end_at: '2025-12-05T18:00:00Z',
    total_amount: 50000,
    currency: 'ARS',
    created_at: '2025-11-28T10:00:00Z',
  } as Booking;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jasmine.createSpy('from'),
      rpc: jasmine.createSpy('rpc'),
    };

    mockWalletService = jasmine.createSpyObj('WalletService', ['lockFunds', 'unlockFunds']);
    mockLoggerService = jasmine.createSpyObj('LoggerService', ['info', 'warn', 'error']);
    mockCarOwnerNotifications = jasmine.createSpyObj('CarOwnerNotificationsService', [
      'notifyPaymentReceived',
    ]);
    mockCarsService = jasmine.createSpyObj('CarsService', ['getCarById']);

    TestBed.configureTestingModule({
      providers: [
        BookingWalletService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => mockSupabaseClient },
        },
        { provide: WalletService, useValue: mockWalletService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: CarOwnerNotificationsService, useValue: mockCarOwnerNotifications },
        { provide: CarsService, useValue: mockCarsService },
      ],
    });

    service = TestBed.inject(BookingWalletService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // chargeRentalFromWallet
  // ========================================
  describe('chargeRentalFromWallet', () => {
    it('should charge rental successfully', async () => {
      mockSupabaseClient.rpc.and.returnValue(Promise.resolve({ data: null, error: null }));

      const result = await service.chargeRentalFromWallet(mockBooking, 10000);

      expect(result.ok).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'wallet_charge_rental',
        jasmine.objectContaining({
          p_user_id: 'user-789',
          p_booking_id: 'booking-123',
          p_amount_cents: 10000,
        }),
      );
    });

    it('should return error when booking has no user_id', async () => {
      const bookingWithoutUser = { ...mockBooking, user_id: undefined };

      const result = await service.chargeRentalFromWallet(bookingWithoutUser as Booking, 10000);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('no user_id');
    });

    it('should return error when RPC fails', async () => {
      mockSupabaseClient.rpc.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'RPC error' } }),
      );

      const result = await service.chargeRentalFromWallet(mockBooking, 10000);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('RPC error');
    });

    it('should handle unexpected exceptions', async () => {
      mockSupabaseClient.rpc.and.rejectWith(new Error('Network error'));

      const result = await service.chargeRentalFromWallet(mockBooking, 10000);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  // ========================================
  // processRentalPayment
  // ========================================
  describe('processRentalPayment', () => {
    it('should process rental payment successfully', async () => {
      mockSupabaseClient.from.and.returnValue(createMockQuery({ data: null, error: null }));

      const result = await service.processRentalPayment(mockBooking, 10000);

      expect(result.ok).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wallet_ledger');
    });

    it('should return error when booking has no owner_id', async () => {
      const bookingWithoutOwner = { ...mockBooking, owner_id: undefined };

      const result = await service.processRentalPayment(bookingWithoutOwner as Booking, 10000);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('no owner_id');
    });

    it('should notify owner after successful payment', async () => {
      mockSupabaseClient.from.and.returnValue(createMockQuery({ data: null, error: null }));

      await service.processRentalPayment(mockBooking, 10000);

      // Give time for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCarOwnerNotifications.notifyPaymentReceived).toHaveBeenCalledWith(
        100, // 10000 cents = 100 ARS
        'booking-123',
        '/bookings/booking-123',
      );
    });

    it('should return error when insert fails', async () => {
      mockSupabaseClient.from.and.returnValue(
        createMockQuery({ data: null, error: { message: 'Insert failed' } }),
      );

      const result = await service.processRentalPayment(mockBooking, 10000);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });

  // ========================================
  // lockSecurityDeposit
  // ========================================
  describe('lockSecurityDeposit', () => {
    it('should lock security deposit successfully', async () => {
      const walletQuery = createMockQuery({
        data: { available_balance: 50000 },
        error: null,
      });
      mockSupabaseClient.from.and.returnValue(walletQuery);

      mockWalletService.lockFunds.and.returnValue(
        of({
          success: true,
          transaction_id: 'tx-001',
          message: 'OK',
          new_available_balance: 40000,
          new_locked_balance: 10000,
        } as WalletLockFundsResponse),
      );

      const result = await service.lockSecurityDeposit(mockBooking, 10000);

      expect(result.ok).toBe(true);
      expect(result.transaction_id).toBe('tx-001');
      expect(mockWalletService.lockFunds).toHaveBeenCalledWith(
        'booking-123',
        10000,
        jasmine.stringContaining('Garantía bloqueada'),
      );
    });

    it('should return error when booking has no user_id', async () => {
      const bookingWithoutUser = { ...mockBooking, user_id: undefined };

      const result = await service.lockSecurityDeposit(bookingWithoutUser as Booking, 10000);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('no user_id');
    });

    it('should return error when balance is insufficient', async () => {
      const walletQuery = createMockQuery({
        data: { available_balance: 5000 }, // Only 5000, need 10000
        error: null,
      });
      mockSupabaseClient.from.and.returnValue(walletQuery);

      const result = await service.lockSecurityDeposit(mockBooking, 10000);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Saldo insuficiente');
    });

    it('should return error when wallet check fails', async () => {
      const walletQuery = createMockQuery({
        data: null,
        error: { message: 'Wallet error' },
      });
      mockSupabaseClient.from.and.returnValue(walletQuery);

      const result = await service.lockSecurityDeposit(mockBooking, 10000);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('checking wallet');
    });

    it('should return error when lock fails', async () => {
      const walletQuery = createMockQuery({
        data: { available_balance: 50000 },
        error: null,
      });
      mockSupabaseClient.from.and.returnValue(walletQuery);

      mockWalletService.lockFunds.and.returnValue(
        of({
          success: false,
          transaction_id: null,
          message: 'Lock failed',
          new_available_balance: 50000,
          new_locked_balance: 0,
        } as WalletLockFundsResponse),
      );

      const result = await service.lockSecurityDeposit(mockBooking, 10000);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Lock failed');
    });
  });

  // ========================================
  // releaseSecurityDeposit
  // ========================================
  describe('releaseSecurityDeposit', () => {
    it('should release security deposit successfully', async () => {
      mockWalletService.unlockFunds.and.returnValue(
        of({
          success: true,
          transaction_id: 'tx-002',
          message: 'OK',
          unlocked_amount: 10000,
          new_available_balance: 50000,
          new_locked_balance: 0,
        } as WalletUnlockFundsResponse),
      );

      const result = await service.releaseSecurityDeposit(mockBooking);

      expect(result.ok).toBe(true);
      expect(mockWalletService.unlockFunds).toHaveBeenCalledWith(
        'booking-123',
        jasmine.stringContaining('Garantía liberada'),
      );
    });

    it('should return error when no deposit is locked', async () => {
      const bookingNotLocked = { ...mockBooking, wallet_status: 'none' as const };

      const result = await service.releaseSecurityDeposit(bookingNotLocked);

      expect(result.ok).toBe(false);
      expect(result.error).toContain('No security deposit is locked');
    });

    it('should return error when unlock fails', async () => {
      mockWalletService.unlockFunds.and.returnValue(
        of({
          success: false,
          transaction_id: null,
          message: 'Unlock failed',
          unlocked_amount: 0,
          new_available_balance: 40000,
          new_locked_balance: 10000,
        } as WalletUnlockFundsResponse),
      );

      const result = await service.releaseSecurityDeposit(mockBooking);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Unlock failed');
    });
  });

  // ========================================
  // deductFromSecurityDeposit
  // ========================================
  describe('deductFromSecurityDeposit', () => {
    it('should deduct damage amount successfully', async () => {
      mockSupabaseClient.rpc.and.returnValue(
        Promise.resolve({
          data: { ok: true, remaining_deposit: 5000, damage_charged: 5000 },
          error: null,
        }),
      );

      const result = await service.deductFromSecurityDeposit(
        mockBooking,
        5000,
        'Minor scratch on bumper',
      );

      expect(result.ok).toBe(true);
      expect(result.remaining_deposit).toBe(5000);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'wallet_deduct_damage_atomic',
        jasmine.objectContaining({
          p_booking_id: 'booking-123',
          p_damage_amount_cents: 5000,
          p_damage_description: 'Minor scratch on bumper',
        }),
      );
    });

    it('should return error when booking has no user_id', async () => {
      const bookingWithoutUser = { ...mockBooking, user_id: undefined };

      const result = await service.deductFromSecurityDeposit(
        bookingWithoutUser as Booking,
        5000,
        'damage',
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('missing user_id');
    });

    it('should return error when booking has no owner_id', async () => {
      const bookingWithoutOwner = { ...mockBooking, owner_id: undefined };

      const result = await service.deductFromSecurityDeposit(
        bookingWithoutOwner as Booking,
        5000,
        'damage',
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('missing user_id or owner_id');
    });

    it('should return error when no deposit is locked', async () => {
      const bookingNotLocked = { ...mockBooking, wallet_status: 'none' as const };

      const result = await service.deductFromSecurityDeposit(bookingNotLocked, 5000, 'damage');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('No security deposit is locked');
    });

    it('should return error when RPC returns error', async () => {
      mockSupabaseClient.rpc.and.returnValue(
        Promise.resolve({ data: { ok: false, error: 'Insufficient funds' }, error: null }),
      );

      const result = await service.deductFromSecurityDeposit(mockBooking, 5000, 'damage');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should return error when RPC throws', async () => {
      mockSupabaseClient.rpc.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'RPC error' } }),
      );

      const result = await service.deductFromSecurityDeposit(mockBooking, 5000, 'damage');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('RPC error');
      expect(mockLoggerService.error).toHaveBeenCalled();
    });
  });

  // ========================================
  // unlockFundsForCancellation
  // ========================================
  describe('unlockFundsForCancellation', () => {
    it('should unlock funds successfully', async () => {
      mockWalletService.unlockFunds.and.returnValue(
        of({
          success: true,
          transaction_id: 'tx-003',
          message: 'OK',
          unlocked_amount: 10000,
          new_available_balance: 50000,
          new_locked_balance: 0,
        } as WalletUnlockFundsResponse),
      );

      const result = await service.unlockFundsForCancellation(mockBooking, 'User requested');

      expect(result.ok).toBe(true);
      expect(mockWalletService.unlockFunds).toHaveBeenCalledWith(
        'booking-123',
        jasmine.stringContaining('User requested'),
      );
    });

    it('should return ok when no funds to unlock', async () => {
      const bookingNotLocked = {
        ...mockBooking,
        wallet_status: 'none' as const,
        wallet_lock_transaction_id: undefined,
      };

      const result = await service.unlockFundsForCancellation(bookingNotLocked);

      expect(result.ok).toBe(true);
      expect(mockWalletService.unlockFunds).not.toHaveBeenCalled();
    });

    it('should return error when unlock fails', async () => {
      mockWalletService.unlockFunds.and.returnValue(
        of({
          success: false,
          transaction_id: null,
          message: 'Unlock failed',
          unlocked_amount: 0,
          new_available_balance: 40000,
          new_locked_balance: 10000,
        } as WalletUnlockFundsResponse),
      );

      const result = await service.unlockFundsForCancellation(mockBooking);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Unlock failed');
      expect(mockLoggerService.error).toHaveBeenCalled();
    });

    it('should handle unexpected exceptions', async () => {
      mockWalletService.unlockFunds.and.throwError(new Error('Network error'));

      const result = await service.unlockFundsForCancellation(mockBooking);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});
