import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  onboardingGuard,
  tosGuard,
  verifiedDriverGuard,
  verifiedEmailGuard,
  kycGuard,
} from './onboarding.guard';
import { ProfileService } from '../services/profile.service';

describe('Onboarding Guards', () => {
  let profileService: jasmine.SpyObj<ProfileService>;
  let router: jasmine.SpyObj<Router>;

  const mockProfile = {
    id: 'user-123',
    email: 'user@example.com',
    is_email_verified: true,
    is_driver_verified: true,
    kyc: 'verified' as const,
    has_accepted_tos: true,
  };

  beforeEach(() => {
    const profileServiceSpy = jasmine.createSpyObj('ProfileService', [
      'hasCompletedOnboarding',
      'hasAcceptedTOS',
      'getMe',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileService, useValue: profileServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    profileService = TestBed.inject(ProfileService) as jasmine.SpyObj<ProfileService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  // ============================================================================
  // ONBOARDING GUARD TESTS
  // ============================================================================

  describe('onboardingGuard', () => {
    it('should allow access when onboarding is completed', async () => {
      // Arrange
      profileService.hasCompletedOnboarding.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => onboardingGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
      expect(profileService.hasCompletedOnboarding).toHaveBeenCalled();
    });

    it('should redirect to onboarding when not completed', async () => {
      // Arrange
      const onboardingUrlTree = { toString: () => '/onboarding' } as any;
      profileService.hasCompletedOnboarding.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(onboardingUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => onboardingGuard(null as any, []));

      // Assert
      expect(result).toBe(onboardingUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/onboarding']);
    });

    it('should allow access on error (fail-open)', async () => {
      // Arrange
      profileService.hasCompletedOnboarding.and.returnValue(
        Promise.reject(new Error('Service error')),
      );

      // Act
      const result = await TestBed.runInInjectionContext(() => onboardingGuard(null as any, []));

      // Assert
      expect(result).toBe(true); // Fail-open
    });

    it('should handle new user who has not completed onboarding', async () => {
      // Arrange - New user tries to publish a car without completing onboarding
      const onboardingUrlTree = { toString: () => '/onboarding' } as any;
      profileService.hasCompletedOnboarding.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(onboardingUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => onboardingGuard(null as any, []));

      // Assert
      expect(result).toBe(onboardingUrlTree);
    });
  });

  // ============================================================================
  // TOS GUARD TESTS
  // ============================================================================

  describe('tosGuard', () => {
    it('should allow access when TOS is accepted', async () => {
      // Arrange
      profileService.hasAcceptedTOS.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => tosGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
      expect(profileService.hasAcceptedTOS).toHaveBeenCalled();
    });

    it('should redirect to profile when TOS not accepted', async () => {
      // Arrange
      const profileUrlTree = {
        toString: () => '/profile?tab=security&tos=required',
      } as any;
      profileService.hasAcceptedTOS.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => tosGuard(null as any, []));

      // Assert
      expect(result).toBe(profileUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/profile'],
        { queryParams: { tab: 'security', tos: 'required' } },
      );
    });

    it('should allow access on error (fail-open)', async () => {
      // Arrange
      profileService.hasAcceptedTOS.and.returnValue(Promise.reject(new Error('Service error')));

      // Act
      const result = await TestBed.runInInjectionContext(() => tosGuard(null as any, []));

      // Assert
      expect(result).toBe(true); // Fail-open
    });

    it('should require TOS acceptance for booking creation', async () => {
      // Arrange - User tries to create booking without accepting TOS
      const profileUrlTree = {
        toString: () => '/profile?tab=security&tos=required',
      } as any;
      profileService.hasAcceptedTOS.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => tosGuard(null as any, []));

      // Assert
      expect(result).toBe(profileUrlTree);
    });
  });

  // ============================================================================
  // VERIFIED DRIVER GUARD TESTS
  // ============================================================================

  describe('verifiedDriverGuard', () => {
    it('should allow access when driver is verified', async () => {
      // Arrange
      profileService.getMe.and.returnValue(Promise.resolve(mockProfile));

      // Act
      const result = await TestBed.runInInjectionContext(() =>
        verifiedDriverGuard(null as any, []),
      );

      // Assert
      expect(result).toBe(true);
      expect(profileService.getMe).toHaveBeenCalled();
    });

    it('should redirect to profile when driver not verified', async () => {
      // Arrange
      const profileUrlTree = {
        toString: () => '/profile?tab=verification&driver=required',
      } as any;
      const unverifiedProfile = { ...mockProfile, is_driver_verified: false };

      profileService.getMe.and.returnValue(Promise.resolve(unverifiedProfile));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() =>
        verifiedDriverGuard(null as any, []),
      );

      // Assert
      expect(result).toBe(profileUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/profile'],
        { queryParams: { tab: 'verification', driver: 'required' } },
      );
    });

    it('should block access on error (fail-closed)', async () => {
      // Arrange
      const profileUrlTree = { toString: () => '/profile?tab=verification' } as any;
      profileService.getMe.and.returnValue(Promise.reject(new Error('Service error')));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() =>
        verifiedDriverGuard(null as any, []),
      );

      // Assert
      expect(result).toBe(profileUrlTree); // Fail-closed for security
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/profile'],
        { queryParams: { tab: 'verification' } },
      );
    });

    it('should require driver verification for car publication', async () => {
      // Arrange - User tries to publish car without driver verification
      const profileUrlTree = {
        toString: () => '/profile?tab=verification&driver=required',
      } as any;
      const unverifiedProfile = { ...mockProfile, is_driver_verified: false };

      profileService.getMe.and.returnValue(Promise.resolve(unverifiedProfile));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() =>
        verifiedDriverGuard(null as any, []),
      );

      // Assert
      expect(result).toBe(profileUrlTree);
    });
  });

  // ============================================================================
  // VERIFIED EMAIL GUARD TESTS
  // ============================================================================

  describe('verifiedEmailGuard', () => {
    it('should allow access when email is verified', async () => {
      // Arrange
      profileService.getMe.and.returnValue(Promise.resolve(mockProfile));

      // Act
      const result = await TestBed.runInInjectionContext(() =>
        verifiedEmailGuard(null as any, []),
      );

      // Assert
      expect(result).toBe(true);
      expect(profileService.getMe).toHaveBeenCalled();
    });

    it('should redirect to profile when email not verified', async () => {
      // Arrange
      const profileUrlTree = {
        toString: () => '/profile?tab=security&email=required',
      } as any;
      const unverifiedProfile = { ...mockProfile, is_email_verified: false };

      profileService.getMe.and.returnValue(Promise.resolve(unverifiedProfile));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() =>
        verifiedEmailGuard(null as any, []),
      );

      // Assert
      expect(result).toBe(profileUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/profile'],
        { queryParams: { tab: 'security', email: 'required' } },
      );
    });

    it('should block access on error (fail-closed)', async () => {
      // Arrange
      const profileUrlTree = { toString: () => '/profile?tab=security' } as any;
      profileService.getMe.and.returnValue(Promise.reject(new Error('Service error')));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() =>
        verifiedEmailGuard(null as any, []),
      );

      // Assert
      expect(result).toBe(profileUrlTree); // Fail-closed for security
    });

    it('should require email verification for booking creation', async () => {
      // Arrange
      const profileUrlTree = {
        toString: () => '/profile?tab=security&email=required',
      } as any;
      const unverifiedProfile = { ...mockProfile, is_email_verified: false };

      profileService.getMe.and.returnValue(Promise.resolve(unverifiedProfile));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() =>
        verifiedEmailGuard(null as any, []),
      );

      // Assert
      expect(result).toBe(profileUrlTree);
    });
  });

  // ============================================================================
  // KYC GUARD TESTS
  // ============================================================================

  describe('kycGuard', () => {
    it('should allow access when KYC is verified', async () => {
      // Arrange
      profileService.getMe.and.returnValue(Promise.resolve(mockProfile));

      // Act
      const result = await TestBed.runInInjectionContext(() => kycGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
      expect(profileService.getMe).toHaveBeenCalled();
    });

    it('should redirect to profile when KYC not verified', async () => {
      // Arrange
      const profileUrlTree = {
        toString: () => '/profile?tab=verification&kyc=required',
      } as any;
      const unverifiedProfile = { ...mockProfile, kyc: 'pending' };

      profileService.getMe.and.returnValue(Promise.resolve(unverifiedProfile));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => kycGuard(null as any, []));

      // Assert
      expect(result).toBe(profileUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/profile'],
        { queryParams: { tab: 'verification', kyc: 'required' } },
      );
    });

    it('should block access for rejected KYC', async () => {
      // Arrange
      const profileUrlTree = {
        toString: () => '/profile?tab=verification&kyc=required',
      } as any;
      const rejectedProfile = { ...mockProfile, kyc: 'rejected' };

      profileService.getMe.and.returnValue(Promise.resolve(rejectedProfile));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => kycGuard(null as any, []));

      // Assert
      expect(result).toBe(profileUrlTree);
    });

    it('should block access for pending KYC', async () => {
      // Arrange
      const profileUrlTree = {
        toString: () => '/profile?tab=verification&kyc=required',
      } as any;
      const pendingProfile = { ...mockProfile, kyc: 'pending' };

      profileService.getMe.and.returnValue(Promise.resolve(pendingProfile));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => kycGuard(null as any, []));

      // Assert
      expect(result).toBe(profileUrlTree);
    });

    it('should block access on error (fail-closed)', async () => {
      // Arrange
      const profileUrlTree = { toString: () => '/profile?tab=verification' } as any;
      profileService.getMe.and.returnValue(Promise.reject(new Error('Service error')));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => kycGuard(null as any, []));

      // Assert
      expect(result).toBe(profileUrlTree); // Fail-closed for security
    });

    it('should require KYC for payout access', async () => {
      // Arrange - Owner tries to access payouts without KYC
      const profileUrlTree = {
        toString: () => '/profile?tab=verification&kyc=required',
      } as any;
      const unverifiedProfile = { ...mockProfile, kyc: 'pending' };

      profileService.getMe.and.returnValue(Promise.resolve(unverifiedProfile));
      router.createUrlTree.and.returnValue(profileUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => kycGuard(null as any, []));

      // Assert
      expect(result).toBe(profileUrlTree);
    });
  });

  // ============================================================================
  // REAL-WORLD COMBINED SCENARIOS
  // ============================================================================

  describe('Combined Guard Scenarios', () => {
    it('should handle fully verified user accessing all protected routes', async () => {
      // Arrange - User with all verifications complete
      profileService.hasCompletedOnboarding.and.returnValue(Promise.resolve(true));
      profileService.hasAcceptedTOS.and.returnValue(Promise.resolve(true));
      profileService.getMe.and.returnValue(Promise.resolve(mockProfile));

      // Act - Test all guards
      const results = await Promise.all([
        TestBed.runInInjectionContext(() => onboardingGuard(null as any, [])),
        TestBed.runInInjectionContext(() => tosGuard(null as any, [])),
        TestBed.runInInjectionContext(() => verifiedDriverGuard(null as any, [])),
        TestBed.runInInjectionContext(() => verifiedEmailGuard(null as any, [])),
        TestBed.runInInjectionContext(() => kycGuard(null as any, [])),
      ]);

      // Assert
      expect(results.every((r) => r === true)).toBe(true);
    });

    it('should handle new user with no verifications', async () => {
      // Arrange
      const onboardingUrlTree = { toString: () => '/onboarding' } as any;
      const profileUrlTree = { toString: () => '/profile?tab=...' } as any;

      const newUserProfile = {
        ...mockProfile,
        is_email_verified: false,
        is_driver_verified: false,
        kyc: 'pending',
        has_accepted_tos: false,
      };

      profileService.hasCompletedOnboarding.and.returnValue(Promise.resolve(false));
      profileService.hasAcceptedTOS.and.returnValue(Promise.resolve(false));
      profileService.getMe.and.returnValue(Promise.resolve(newUserProfile));
      router.createUrlTree.and.returnValue(onboardingUrlTree);

      // Act
      const onboardingResult = await TestBed.runInInjectionContext(() =>
        onboardingGuard(null as any, []),
      );

      router.createUrlTree.and.returnValue(profileUrlTree);
      const tosResult = await TestBed.runInInjectionContext(() => tosGuard(null as any, []));
      const driverResult = await TestBed.runInInjectionContext(() =>
        verifiedDriverGuard(null as any, []),
      );
      const emailResult = await TestBed.runInInjectionContext(() =>
        verifiedEmailGuard(null as any, []),
      );
      const kycResult = await TestBed.runInInjectionContext(() => kycGuard(null as any, []));

      // Assert - All guards should block
      expect(onboardingResult).not.toBe(true);
      expect(tosResult).not.toBe(true);
      expect(driverResult).not.toBe(true);
      expect(emailResult).not.toBe(true);
      expect(kycResult).not.toBe(true);
    });
  });
});
