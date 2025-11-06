import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DriverProfileService, DriverProfile, ClassBenefits, ClassUpdateResult } from './driver-profile.service';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

describe('DriverProfileService', () => {
  let service: DriverProfileService;
  let supabaseClientServiceMock: jasmine.SpyObj<SupabaseClientService>;
  let loggerServiceMock: jasmine.SpyObj<LoggerService>;
  let supabaseMock: any;

  const mockProfile: DriverProfile = {
    user_id: 'user-123',
    class: 5,
    driver_score: 75,
    good_years: 0,
    total_claims: 0,
    claims_with_fault: 0,
    total_bookings: 0,
    clean_bookings: 0,
    clean_percentage: 0,
    last_claim_at: null,
    last_claim_with_fault: null,
    last_class_update: '2025-01-01T00:00:00Z',
    fee_multiplier: 1.0,
    guarantee_multiplier: 1.0,
    class_description: 'Conductor base (sin historial)',
    is_active: true,
  };

  const mockClassBenefits: ClassBenefits = {
    current_class: 5,
    current_class_description: 'Conductor base (sin historial)',
    current_fee_multiplier: 1.0,
    current_guarantee_multiplier: 1.0,
    next_better_class: 4,
    next_better_description: 'Normal (1 año sin reclamos)',
    next_better_fee_multiplier: 0.99,
    next_better_guarantee_multiplier: 0.95,
    clean_bookings_needed: 5,
    can_improve: true,
  };

  beforeEach(() => {
    const rpcSpy = jasmine.createSpy('rpc').and.returnValue(
      Promise.resolve({ data: [mockProfile], error: null })
    );

    supabaseMock = {
      rpc: rpcSpy,
    };

    supabaseClientServiceMock = jasmine.createSpyObj('SupabaseClientService', ['getClient']);
    supabaseClientServiceMock.getClient.and.returnValue(supabaseMock);

    loggerServiceMock = jasmine.createSpyObj('LoggerService', ['info', 'error']);

    TestBed.configureTestingModule({
      providers: [
        DriverProfileService,
        { provide: SupabaseClientService, useValue: supabaseClientServiceMock },
        { provide: LoggerService, useValue: loggerServiceMock },
      ],
    });

    service = TestBed.inject(DriverProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProfile', () => {
    it('should fetch and set driver profile', (done) => {
      service.getProfile('user-123').subscribe({
        next: (profile) => {
          expect(profile).toEqual(mockProfile);
          expect(service.profile()).toEqual(mockProfile);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_driver_profile', { p_user_id: 'user-123' });
          done();
        },
        error: done.fail,
      });
    });

    it('should call without user_id when not provided', (done) => {
      service.getProfile().subscribe({
        next: () => {
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_driver_profile', {});
          done();
        },
        error: done.fail,
      });
    });

    it('should initialize profile if NO_PROFILE error', (done) => {
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [], error: null }), // First call returns empty (NO_PROFILE)
        Promise.resolve({ data: 'user-123', error: null }), // initialize_driver_profile
        Promise.resolve({ data: [mockProfile], error: null }) // Second getProfile call
      );

      service.getProfile('user-123').subscribe({
        next: (profile) => {
          expect(profile).toEqual(mockProfile);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('initialize_driver_profile', { p_user_id: 'user-123' });
          done();
        },
        error: done.fail,
      });
    });

    it('should handle errors', (done) => {
      const error = new Error('Database error');
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: null, error }));

      service.getProfile('user-123').subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err).toEqual(error);
          expect(service.error()).toEqual({ message: 'Error al obtener perfil de conductor' });
          expect(loggerServiceMock.error).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should set loading state', (done) => {
      expect(service.loading()).toBe(false);

      service.getProfile('user-123').subscribe({
        complete: () => {
          expect(service.loading()).toBe(false);
          done();
        },
      });

      // Loading should be true during the call (checked synchronously)
      setTimeout(() => {
        expect(service.loading()).toBe(true);
      }, 0);
    });
  });

  describe('updateClassOnEvent', () => {
    const mockUpdateResult: ClassUpdateResult = {
      old_class: 5,
      new_class: 4,
      class_change: -1,
      reason: 'Reserva sin daños completada',
      fee_multiplier_old: 1.0,
      fee_multiplier_new: 0.99,
      guarantee_multiplier_old: 1.0,
      guarantee_multiplier_new: 0.95,
    };

    it('should update class after clean booking', (done) => {
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [mockUpdateResult], error: null }),
        Promise.resolve({ data: [{ ...mockProfile, class: 4 }], error: null })
      );

      service.updateClassOnEvent({
        userId: 'user-123',
        bookingId: 'booking-456',
        claimWithFault: false,
        claimSeverity: 0,
      }).subscribe({
        next: (result) => {
          expect(result).toEqual(mockUpdateResult);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('update_driver_class_on_event', {
            p_user_id: 'user-123',
            p_booking_id: 'booking-456',
            p_claim_id: null,
            p_claim_with_fault: false,
            p_claim_severity: 0,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should update class after claim with fault', (done) => {
      const claimUpdateResult = { ...mockUpdateResult, old_class: 5, new_class: 7, class_change: 2 };
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [claimUpdateResult], error: null }),
        Promise.resolve({ data: [{ ...mockProfile, class: 7 }], error: null })
      );

      service.updateClassOnEvent({
        userId: 'user-123',
        claimId: 'claim-789',
        claimWithFault: true,
        claimSeverity: 2,
      }).subscribe({
        next: (result) => {
          expect(result.new_class).toBe(7);
          expect(result.class_change).toBe(2);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('getClassBenefits', () => {
    it('should fetch class benefits', (done) => {
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: [mockClassBenefits], error: null }));

      service.getClassBenefits('user-123').subscribe({
        next: (benefits) => {
          expect(benefits).toEqual(mockClassBenefits);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_user_class_benefits', { p_user_id: 'user-123' });
          done();
        },
        error: done.fail,
      });
    });

    it('should handle empty data', (done) => {
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: [], error: null }));

      service.getClassBenefits('user-123').subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err.message).toBe('No se pudieron obtener beneficios de clase');
          done();
        },
      });
    });
  });

  describe('computed signals', () => {
    it('should compute driverClass from profile', () => {
      service.profile.set(mockProfile);
      expect(service.driverClass()).toBe(5);
    });

    it('should return default when profile is null', () => {
      service.profile.set(null);
      expect(service.driverClass()).toBe(5);
      expect(service.driverScore()).toBe(50);
      expect(service.cleanPercentage()).toBe(0);
    });

    it('should compute all values correctly', () => {
      const profile: DriverProfile = {
        ...mockProfile,
        class: 3,
        driver_score: 85,
        clean_percentage: 90,
        fee_multiplier: 0.97,
        guarantee_multiplier: 0.90,
        class_description: 'Normal Plus',
      };
      service.profile.set(profile);

      expect(service.driverClass()).toBe(3);
      expect(service.driverScore()).toBe(85);
      expect(service.cleanPercentage()).toBe(90);
      expect(service.feeMultiplier()).toBe(0.97);
      expect(service.guaranteeMultiplier()).toBe(0.90);
      expect(service.classDescription()).toBe('Normal Plus');
    });
  });

  describe('refresh', () => {
    it('should call getProfile', () => {
      spyOn(service, 'getProfile').and.returnValue(of(mockProfile));
      service.refresh();
      expect(service.getProfile).toHaveBeenCalled();
    });
  });
});
