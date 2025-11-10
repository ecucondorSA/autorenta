import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  BonusProtectorService,
  BonusProtector,
  PurchaseProtectorResult,
} from './bonus-protector.service';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

describe('BonusProtectorService', () => {
  let service: BonusProtectorService;
  let supabaseClientServiceMock: jasmine.SpyObj<SupabaseClientService>;
  let loggerServiceMock: jasmine.SpyObj<LoggerService>;
  let supabaseMock: any;

  const mockActiveProtector: BonusProtector = {
    has_active_protector: true,
    addon_id: 'addon-123',
    protection_level: 2,
    max_protected_claims: 2,
    claims_used: 0,
    remaining_uses: 2,
    purchase_date: '2025-01-01T00:00:00Z',
    expires_at: '2025-07-01T00:00:00Z',
    days_until_expiration: 180,
    is_expired: false,
  };

  const mockNoProtector: BonusProtector = {
    has_active_protector: false,
    addon_id: null,
    protection_level: 0,
    max_protected_claims: 0,
    claims_used: 0,
    remaining_uses: 0,
    purchase_date: null,
    expires_at: null,
    days_until_expiration: null,
    is_expired: false,
  };

  const mockPurchaseResult: PurchaseProtectorResult = {
    success: true,
    message: 'Protector activado exitosamente',
    addon_id: 'addon-456',
    protection_level: 2,
    max_protected_claims: 2,
    expires_at: '2025-07-01T00:00:00Z',
    price_paid_cents: 3000,
  };

  beforeEach(() => {
    const rpcSpy = jasmine
      .createSpy('rpc')
      .and.returnValue(Promise.resolve({ data: [mockActiveProtector], error: null }));

    supabaseMock = {
      rpc: rpcSpy,
    };

    supabaseClientServiceMock = jasmine.createSpyObj('SupabaseClientService', ['getClient']);
    supabaseClientServiceMock.getClient.and.returnValue(supabaseMock);

    loggerServiceMock = jasmine.createSpyObj('LoggerService', ['info', 'error']);

    TestBed.configureTestingModule({
      providers: [
        BonusProtectorService,
        { provide: SupabaseClientService, useValue: supabaseClientServiceMock },
        { provide: LoggerService, useValue: loggerServiceMock },
      ],
    });

    service = TestBed.inject(BonusProtectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('activeProtector', () => {
    it('should fetch and set active protector', (done) => {
      service.activeProtector('user-123').subscribe({
        next: (protector) => {
          expect(protector).toEqual(mockActiveProtector);
          expect(service.protector()).toEqual(mockActiveProtector);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_active_bonus_protector', {
            p_user_id: 'user-123',
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should call without user_id when not provided', (done) => {
      service.activeProtector().subscribe({
        next: () => {
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_active_bonus_protector', {});
          done();
        },
        error: done.fail,
      });
    });

    it('should handle user with no active protector', (done) => {
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: [mockNoProtector], error: null }));

      service.activeProtector('user-123').subscribe({
        next: (protector) => {
          expect(protector.has_active_protector).toBe(false);
          expect(protector.addon_id).toBeNull();
          expect(service.hasActiveProtector()).toBe(false);
          done();
        },
        error: done.fail,
      });
    });

    it('should handle errors', (done) => {
      const error = new Error('Database error');
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: null, error }));

      service.activeProtector('user-123').subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err).toEqual(error);
          expect(service.error()).toEqual({ message: 'Error al obtener Protector de Bonus' });
          expect(loggerServiceMock.error).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should set loading state', (done) => {
      expect(service.loading()).toBe(false);

      service.activeProtector('user-123').subscribe({
        complete: () => {
          expect(service.loading()).toBe(false);
          done();
        },
      });

      setTimeout(() => {
        expect(service.loading()).toBe(true);
      }, 0);
    });
  });

  describe('purchaseProtector', () => {
    it('should purchase protector with level 1', (done) => {
      const level1Result = { ...mockPurchaseResult, protection_level: 1, price_paid_cents: 1500 };
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [level1Result], error: null }),
        Promise.resolve({ data: [mockActiveProtector], error: null }),
      );

      service.purchaseProtector(1).subscribe({
        next: (result) => {
          expect(result).toEqual(level1Result);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('purchase_bonus_protector', {
            p_user_id: 'user-123',
            p_protection_level: 1,
            p_price_cents: 1500,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should purchase protector with level 2', (done) => {
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [mockPurchaseResult], error: null }),
        Promise.resolve({ data: [mockActiveProtector], error: null }),
      );

      service.purchaseProtector(2).subscribe({
        next: (result) => {
          expect(result).toEqual(mockPurchaseResult);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('purchase_bonus_protector', {
            p_user_id: 'user-123',
            p_protection_level: 2,
            p_price_cents: 3000,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should purchase protector with level 3', (done) => {
      const level3Result = { ...mockPurchaseResult, protection_level: 3, price_paid_cents: 4500 };
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [level3Result], error: null }),
        Promise.resolve({ data: [mockActiveProtector], error: null }),
      );

      service.purchaseProtector(3).subscribe({
        next: (result) => {
          expect(result).toEqual(level3Result);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('purchase_bonus_protector', {
            p_user_id: 'user-123',
            p_protection_level: 3,
            p_price_cents: 4500,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should use default level 1 when not specified', (done) => {
      const level1Result = { ...mockPurchaseResult, protection_level: 1, price_paid_cents: 1500 };
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [level1Result], error: null }),
        Promise.resolve({ data: [mockActiveProtector], error: null }),
      );

      service.purchaseProtector('user-123').subscribe({
        next: (result) => {
          expect(supabaseMock.rpc).toHaveBeenCalledWith('purchase_bonus_protector', {
            p_user_id: 'user-123',
            p_protection_level: 1,
            p_price_cents: 1500,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should refresh protector info after successful purchase', (done) => {
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [mockPurchaseResult], error: null }),
        Promise.resolve({ data: [mockActiveProtector], error: null }),
      );

      service.purchaseProtector(2).subscribe({
        next: () => {
          // Should call rpc twice: once for purchase, once for activeProtector
          expect(supabaseMock.rpc).toHaveBeenCalledTimes(2);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_active_bonus_protector', {
            p_user_id: 'user-123',
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should not refresh if purchase failed', (done) => {
      const failedResult = { ...mockPurchaseResult, success: false };
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: [failedResult], error: null }));

      service.purchaseProtector(2).subscribe({
        next: (result) => {
          expect(result.success).toBe(false);
          // Should only call rpc once (no refresh)
          expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
          done();
        },
        error: done.fail,
      });
    });

    it('should handle errors', (done) => {
      const error = new Error('Purchase failed');
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: null, error }));

      service.purchaseProtector(2).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err).toEqual(error);
          expect(service.error()).toEqual({ message: 'Error al comprar Protector de Bonus' });
          expect(loggerServiceMock.error).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('computed signals', () => {
    it('should compute hasActiveProtector from protector', () => {
      service.protector.set(mockActiveProtector);
      expect(service.hasActiveProtector()).toBe(true);
    });

    it('should compute remainingUses from protector', () => {
      service.protector.set(mockActiveProtector);
      expect(service.remainingUses()).toBe(2);
    });

    it('should compute protectionLevel from protector', () => {
      service.protector.set(mockActiveProtector);
      expect(service.protectionLevel()).toBe(2);
    });

    it('should return defaults when protector is null', () => {
      service.protector.set(null);
      expect(service.hasActiveProtector()).toBe(false);
      expect(service.remainingUses()).toBe(0);
      expect(service.protectionLevel()).toBe(0);
    });

    it('should handle protector with no active status', () => {
      service.protector.set(mockNoProtector);
      expect(service.hasActiveProtector()).toBe(false);
      expect(service.remainingUses()).toBe(0);
      expect(service.protectionLevel()).toBe(0);
    });

    it('should handle protector with partial uses', () => {
      const partialProtector: BonusProtector = {
        ...mockActiveProtector,
        claims_used: 1,
        remaining_uses: 1,
      };
      service.protector.set(partialProtector);
      expect(service.hasActiveProtector()).toBe(true);
      expect(service.remainingUses()).toBe(1);
    });

    it('should handle expired protector', () => {
      const expiredProtector: BonusProtector = {
        ...mockActiveProtector,
        is_expired: true,
        days_until_expiration: -10,
        remaining_uses: 0,
      };
      service.protector.set(expiredProtector);
      expect(service.hasActiveProtector()).toBe(true); // Still stored, but expired
      expect(service.remainingUses()).toBe(0);
    });
  });

  describe('refresh', () => {
    it('should call activeProtector', () => {
      spyOn(service, 'activeProtector').and.returnValue(of(mockActiveProtector));

      service.refresh();
      expect(service.activeProtector).toHaveBeenCalled();
    });
  });

  describe('price mapping', () => {
    it('should use correct prices for each level', (done) => {
      const levels = [
        { level: 1, price: 1500 },
        { level: 2, price: 3000 },
        { level: 3, price: 4500 },
      ];

      let callCount = 0;

      levels.forEach(({ level, price }) => {
        const result = { ...mockPurchaseResult, protection_level: level, price_paid_cents: price };
        supabaseMock.rpc.and.returnValues(
          Promise.resolve({ data: [result], error: null }),
          Promise.resolve({ data: [mockActiveProtector], error: null }),
        );

        service.purchaseProtector('user-123', level).subscribe({
          next: () => {
            expect(supabaseMock.rpc).toHaveBeenCalledWith('purchase_bonus_protector', {
              p_user_id: 'user-123',
              p_protection_level: level,
              p_price_cents: price,
            });
            callCount++;
            if (callCount === levels.length) {
              done();
            }
          },
          error: done.fail,
        });
      });
    });
  });
});
