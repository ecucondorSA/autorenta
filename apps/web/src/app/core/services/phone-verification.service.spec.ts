import { TestBed } from '@angular/core/testing';
import { PhoneVerificationService } from './phone-verification.service';
import { SupabaseClientService } from './supabase-client.service';

describe('PhoneVerificationService', () => {
  let service: PhoneVerificationService;
  let supabaseMock: any;

  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    phone: null,
    phone_confirmed_at: null,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    supabaseMock = {
      auth: {
        getUser: jasmine.createSpy('getUser').and.resolveTo({
          data: { user: mockUser },
          error: null,
        }),
        signInWithOtp: jasmine.createSpy('signInWithOtp').and.resolveTo({
          data: {},
          error: null,
        }),
        verifyOtp: jasmine.createSpy('verifyOtp').and.resolveTo({
          data: { session: {} },
          error: null,
        }),
      },
      rpc: jasmine.createSpy('rpc').and.resolveTo({
        data: { success: true },
        error: null,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        PhoneVerificationService,
        {
          provide: SupabaseClientService,
          useValue: {
            getClient: () => supabaseMock,
          },
        },
      ],
    });

    service = TestBed.inject(PhoneVerificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkPhoneStatus', () => {
    it('should set status as not verified when phone_confirmed_at is null', async () => {
      await service.checkPhoneStatus();

      expect(service.status()).toEqual({
        isVerified: false,
        phone: null,
        verifiedAt: null,
        cooldownSeconds: 0,
      });
    });

    it('should set status as verified when phone_confirmed_at exists', async () => {
      const verifiedAt = '2024-01-02T00:00:00.000Z';
      supabaseMock.auth.getUser.and.resolveTo({
        data: {
          user: {
            ...mockUser,
            phone: '+5491112345678',
            phone_confirmed_at: verifiedAt,
          },
        },
        error: null,
      });

      await service.checkPhoneStatus();

      expect(service.status()).toEqual({
        isVerified: true,
        phone: '+5491112345678',
        verifiedAt,
        cooldownSeconds: 0,
      });
    });
  });

  describe('sendOTP', () => {
    it('should send OTP successfully', async () => {
      const result = await service.sendOTP('1112345678', '+54');

      expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+5491112345678',
        options: { channel: 'sms' },
      });
      expect(result).toBe(true);
      expect(service.otpSent()).toBe(true);
    });

    it('should format phone number correctly', async () => {
      await service.sendOTP('11 1234 5678', '+54');

      expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+5491112345678',
        options: { channel: 'sms' },
      });
    });

    it('should enforce rate limiting (3 attempts per hour)', async () => {
      // First 3 attempts should succeed
      await service.sendOTP('1112345678');
      await service.sendOTP('1112345678');
      await service.sendOTP('1112345678');

      // 4th attempt should be rejected
      await expectAsync(service.sendOTP('1112345678')).toBeRejectedWithError(
        /Has alcanzado el límite de 3 intentos por hora/,
      );
    });

    it('should enforce cooldown between sends', async () => {
      await service.sendOTP('1112345678');

      // Immediate retry should fail
      await expectAsync(service.sendOTP('1112345678')).toBeRejectedWithError(
        /Por favor espera \d+ segundos antes de reenviar el código/,
      );
    });

    it('should handle invalid phone numbers', async () => {
      await expectAsync(service.sendOTP('invalid')).toBeRejectedWithError(
        'Número de teléfono inválido',
      );
    });
  });

  describe('verifyOTP', () => {
    const testPhone = '+5491112345678';

    beforeEach(async () => {
      await service.sendOTP('1112345678');
    });

    it('should verify OTP successfully', async () => {
      const result = await service.verifyOTP(testPhone, '123456');

      expect(supabaseMock.auth.verifyOtp).toHaveBeenCalledWith({
        phone: testPhone,
        token: '123456',
        type: 'sms',
      });
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
    });

    it('should validate OTP format', async () => {
      const result1 = await service.verifyOTP(testPhone, '12345');
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('6 dígitos');

      const result2 = await service.verifyOTP(testPhone, 'abcdef');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('6 dígitos');
    });

    it('should handle verification errors', async () => {
      supabaseMock.auth.verifyOtp.and.resolveTo({
        data: { user: null },
        error: { message: 'Invalid OTP' },
      });

      const result = await service.verifyOTP(testPhone, '123456');
      expect(result.success).toBe(false);
      expect(service.error()).toBe('Invalid OTP');
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return correct remaining attempts', () => {
      expect(service.getRemainingAttempts()).toBe(3);
    });

    it('should decrease after each send', async () => {
      await service.sendOTP('1112345678');
      expect(service.getRemainingAttempts()).toBe(2);

      await service.sendOTP('1112345678');
      expect(service.getRemainingAttempts()).toBe(1);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      service.error.set('Some error');
      expect(service.error()).toBe('Some error');

      service.clearError();
      expect(service.error()).toBeNull();
    });
  });
});
