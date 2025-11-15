import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GuestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';

describe('GuestGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'ensureSession',
      'isAuthenticated',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  // ============================================================================
  // GUEST ACCESS TESTS
  // ============================================================================

  describe('Guest (Unauthenticated) Access', () => {
    it('should allow unauthenticated users to access guest routes', async () => {
      // Arrange
      authService.ensureSession.and.returnValue(Promise.resolve(null));
      authService.isAuthenticated.and.returnValue(false);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
      expect(authService.ensureSession).toHaveBeenCalled();
      expect(authService.isAuthenticated).toHaveBeenCalled();
    });

    it('should allow access to login page when not authenticated', async () => {
      // Arrange
      authService.ensureSession.and.returnValue(Promise.resolve(null));
      authService.isAuthenticated.and.returnValue(false);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
    });

    it('should allow access to register page when not authenticated', async () => {
      // Arrange
      authService.ensureSession.and.returnValue(Promise.resolve(null));
      authService.isAuthenticated.and.returnValue(false);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
    });

    it('should allow access to password reset page when not authenticated', async () => {
      // Arrange
      authService.ensureSession.and.returnValue(Promise.resolve(null));
      authService.isAuthenticated.and.returnValue(false);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // AUTHENTICATED USER REDIRECT TESTS
  // ============================================================================

  describe('Authenticated User Redirection', () => {
    it('should redirect authenticated users to /cars', async () => {
      // Arrange
      const carsUrlTree = { toString: () => '/cars' } as any;
      const mockSession = {
        access_token: 'token',
        user: { id: 'user-123' },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      authService.isAuthenticated.and.returnValue(true);
      router.createUrlTree.and.returnValue(carsUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(carsUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/cars']);
    });

    it('should prevent authenticated users from accessing login page', async () => {
      // Arrange
      const carsUrlTree = { toString: () => '/cars' } as any;
      const mockSession = {
        access_token: 'token',
        user: { id: 'user-123' },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      authService.isAuthenticated.and.returnValue(true);
      router.createUrlTree.and.returnValue(carsUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).not.toBe(true);
      expect(result).toBe(carsUrlTree);
    });

    it('should prevent authenticated users from accessing register page', async () => {
      // Arrange
      const carsUrlTree = { toString: () => '/cars' } as any;
      const mockSession = {
        access_token: 'token',
        user: { id: 'user-123' },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      authService.isAuthenticated.and.returnValue(true);
      router.createUrlTree.and.returnValue(carsUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(carsUrlTree);
    });
  });

  // ============================================================================
  // SESSION LOADING TESTS
  // ============================================================================

  describe('Session Loading', () => {
    it('should ensure session is loaded before checking authentication', async () => {
      // Arrange
      let ensureSessionCalled = false;
      let isAuthenticatedCalled = false;

      authService.ensureSession.and.callFake(async () => {
        ensureSessionCalled = true;
        return null;
      });

      authService.isAuthenticated.and.callFake(() => {
        expect(ensureSessionCalled).toBe(true); // Ensure session loaded first
        isAuthenticatedCalled = true;
        return false;
      });

      // Act
      await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(ensureSessionCalled).toBe(true);
      expect(isAuthenticatedCalled).toBe(true);
    });

    it('should handle slow session loading', async () => {
      // Arrange
      authService.ensureSession.and.returnValue(
        new Promise((resolve) => setTimeout(() => resolve(null), 100)),
      );
      authService.isAuthenticated.and.returnValue(false);

      // Act
      const startTime = Date.now();
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));
      const elapsed = Date.now() - startTime;

      // Assert
      expect(result).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle session with missing user', async () => {
      // Arrange
      const sessionWithoutUser = {
        access_token: 'token',
        user: null,
      };

      authService.ensureSession.and.returnValue(Promise.resolve(sessionWithoutUser as any));
      authService.isAuthenticated.and.returnValue(false);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
    });

    it('should handle expired session tokens', async () => {
      // Arrange
      const expiredSession = {
        access_token: 'expired-token',
        user: { id: 'user-123' },
        expires_at: Date.now() - 1000, // Expired 1 second ago
      };

      authService.ensureSession.and.returnValue(Promise.resolve(expiredSession as any));
      authService.isAuthenticated.and.returnValue(false); // Expired = not authenticated

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
    });

    it('should handle session loading errors gracefully', async () => {
      // Arrange
      authService.ensureSession.and.returnValue(Promise.reject(new Error('Session error')));
      authService.isAuthenticated.and.returnValue(false);

      // Act & Assert
      // Guard should propagate the error (no try-catch in implementation)
      await expectAsync(
        TestBed.runInInjectionContext(() => GuestGuard(null as any, [])),
      ).toBeRejected();
    });
  });

  // ============================================================================
  // REAL-WORLD SCENARIO TESTS
  // ============================================================================

  describe('Real-World Scenarios', () => {
    it('should handle user trying to access login while already logged in', async () => {
      // Arrange - User clicks "Login" from navbar while already authenticated
      const carsUrlTree = { toString: () => '/cars' } as any;
      const mockSession = {
        access_token: 'active-token',
        user: { id: 'user-123', email: 'user@example.com' },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      authService.isAuthenticated.and.returnValue(true);
      router.createUrlTree.and.returnValue(carsUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(carsUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/cars']);
    });

    it('should handle user accessing register after logout', async () => {
      // Arrange - User logs out and tries to register a new account
      authService.ensureSession.and.returnValue(Promise.resolve(null));
      authService.isAuthenticated.and.returnValue(false);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(true); // Allow access to register
    });

    it('should handle browser back button after login', async () => {
      // Arrange - User logs in, then presses back to login page
      const carsUrlTree = { toString: () => '/cars' } as any;
      const mockSession = {
        access_token: 'token',
        user: { id: 'user-123' },
      };

      authService.ensureSession.and.returnValue(Promise.resolve(mockSession));
      authService.isAuthenticated.and.returnValue(true);
      router.createUrlTree.and.returnValue(carsUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => GuestGuard(null as any, []));

      // Assert
      expect(result).toBe(carsUrlTree); // Should redirect back to /cars
    });
  });

  // ============================================================================
  // CONCURRENCY TESTS
  // ============================================================================

  describe('Concurrent Guard Execution', () => {
    it('should handle multiple concurrent guard checks', async () => {
      // Arrange
      authService.ensureSession.and.returnValue(Promise.resolve(null));
      authService.isAuthenticated.and.returnValue(false);

      // Act - Simulate multiple route guards being checked concurrently
      const results = await Promise.all([
        TestBed.runInInjectionContext(() => GuestGuard(null as any, [])),
        TestBed.runInInjectionContext(() => GuestGuard(null as any, [])),
        TestBed.runInInjectionContext(() => GuestGuard(null as any, [])),
      ]);

      // Assert
      expect(results.every((r) => r === true)).toBe(true);
      expect(authService.ensureSession).toHaveBeenCalledTimes(3);
    });
  });
});
