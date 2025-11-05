import { TestBed } from '@angular/core/testing';
import { EmailVerificationService } from './email-verification.service';
import { SupabaseClientService } from './supabase-client.service';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let supabaseMock: any;

  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    email_confirmed_at: null,
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
      },
      rpc: jasmine.createSpy('rpc').and.resolveTo({
        data: { success: true },
        error: null,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: SupabaseClientService,
          useValue: {
            getClient: () => supabaseMock,
          },
        },
      ],
    });

    service = TestBed.inject(EmailVerificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkEmailStatus', () => {
    it('should set status as not verified when email_confirmed_at is null', async () => {
      await service.checkEmailStatus();

      expect(service.status()).toEqual({
        isVerified: false,
        email: 'test@example.com',
        verifiedAt: null,
        cooldownSeconds: 0,
      });
    });

    it('should set status as verified when email_confirmed_at exists', async () => {
      const verifiedAt = '2024-01-02T00:00:00.000Z';
      supabaseMock.auth.getUser.and.resolveTo({
        data: {
          user: { ...mockUser, email_confirmed_at: verifiedAt },
        },
        error: null,
      });

      await service.checkEmailStatus();

      expect(service.status()).toEqual({
        isVerified: true,
        email: 'test@example.com',
        verifiedAt,
        cooldownSeconds: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      supabaseMock.auth.getUser.and.resolveTo({
        data: { user: null },
        error: { message: 'User not found' },
      });

      await service.checkEmailStatus();

      expect(service.error()).toBe('User not found');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const result = await service.resendVerificationEmail();

      expect(supabaseMock.rpc).toHaveBeenCalledWith('resend_verification_email');
      expect(result).toBe(true);
      expect(service.loading()).toBe(false);
    });

    it('should enforce cooldown period', async () => {
      // First call succeeds
      await service.resendVerificationEmail();

      // Second call within cooldown should throw
      await expectAsync(service.resendVerificationEmail()).toBeRejectedWithError(
        /Por favor espera \d+ segundos antes de reenviar el email/,
      );
    });

    it('should set loading state while sending', async () => {
      const promise = service.resendVerificationEmail();
      expect(service.loading()).toBe(true);
      await promise;
      expect(service.loading()).toBe(false);
    });

    it('should handle RPC errors', async () => {
      supabaseMock.rpc.and.resolveTo({
        data: null,
        error: { message: 'RPC failed' },
      });

      await expectAsync(service.resendVerificationEmail()).toBeRejectedWithError('RPC failed');
      expect(service.error()).toBe('RPC failed');
    });
  });

  describe('startCooldownTimer', () => {
    it('should call callback with remaining seconds', (done) => {
      let callCount = 0;
      const stopTimer = service.startCooldownTimer((remaining) => {
        callCount++;
        expect(remaining).toBeGreaterThanOrEqual(0);
        expect(remaining).toBeLessThanOrEqual(60);

        if (callCount === 3) {
          stopTimer();
          done();
        }
      });
    });

    it('should stop when stopTimer is called', (done) => {
      let callCount = 0;
      const stopTimer = service.startCooldownTimer(() => {
        callCount++;
      });

      setTimeout(() => {
        stopTimer();
        const countAtStop = callCount;

        setTimeout(() => {
          expect(callCount).toBe(countAtStop); // No more calls after stop
          done();
        }, 100);
      }, 150);
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
