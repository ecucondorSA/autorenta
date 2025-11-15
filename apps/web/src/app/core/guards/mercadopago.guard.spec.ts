import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MercadoPagoGuard } from './mercadopago.guard';
import { MercadoPagoOAuthService } from '../services/mercadopago-oauth.service';

describe('MercadoPagoGuard', () => {
  let oauthService: jasmine.SpyObj<MercadoPagoOAuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const oauthServiceSpy = jasmine.createSpyObj('MercadoPagoOAuthService', ['canPublishCars']);
    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree'], { url: '/cars/publish' });

    TestBed.configureTestingModule({
      providers: [
        { provide: MercadoPagoOAuthService, useValue: oauthServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    oauthService = TestBed.inject(MercadoPagoOAuthService) as jasmine.SpyObj<MercadoPagoOAuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  // ============================================================================
  // MERCADOPAGO CONNECTION TESTS
  // ============================================================================

  describe('MercadoPago Connection Check', () => {
    it('should allow access when user has MercadoPago connected', async () => {
      // Arrange
      oauthService.canPublishCars.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
      expect(oauthService.canPublishCars).toHaveBeenCalled();
    });

    it('should redirect to connect page when MercadoPago not connected', async () => {
      // Arrange
      const connectUrlTree = {
        toString: () => '/profile/mercadopago-connect?returnUrl=/cars/publish',
      } as any;

      oauthService.canPublishCars.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(connectUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(connectUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/profile/mercadopago-connect'],
        jasmine.objectContaining({
          queryParams: { returnUrl: '/cars/publish' },
        }),
      );
    });

    it('should check MercadoPago connection before allowing car publication', async () => {
      // Arrange - User tries to publish a car
      oauthService.canPublishCars.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
      expect(oauthService.canPublishCars).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should allow access on error (fail-open)', async () => {
      // Arrange
      oauthService.canPublishCars.and.returnValue(Promise.reject(new Error('API error')));

      // Spy on console.warn
      spyOn(console, 'warn');

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(true); // Fail-open: allow access on error
      expect(console.warn).toHaveBeenCalledWith(
        '[MercadoPagoGuard] Error verificando conexión:',
        jasmine.any(Error),
      );
    });

    it('should handle network timeout errors gracefully', async () => {
      // Arrange
      oauthService.canPublishCars.and.returnValue(Promise.reject(new Error('Network timeout')));
      spyOn(console, 'warn');

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(true); // Allow access despite error
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle MercadoPago API errors gracefully', async () => {
      // Arrange
      oauthService.canPublishCars.and.returnValue(
        Promise.reject(new Error('MercadoPago API unavailable')),
      );
      spyOn(console, 'warn');

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // REAL-WORLD SCENARIO TESTS
  // ============================================================================

  describe('Real-World Scenarios', () => {
    it('should handle owner trying to publish first car without MercadoPago', async () => {
      // Arrange - New owner tries to publish their first car
      const connectUrlTree = {
        toString: () => '/profile/mercadopago-connect?returnUrl=/cars/publish',
      } as any;

      oauthService.canPublishCars.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(connectUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(connectUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/profile/mercadopago-connect'],
        jasmine.objectContaining({
          queryParams: { returnUrl: '/cars/publish' },
        }),
      );
    });

    it('should allow owner with MercadoPago to publish car', async () => {
      // Arrange - Owner with connected MercadoPago
      oauthService.canPublishCars.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
    });

    it('should handle owner with expired MercadoPago token', async () => {
      // Arrange - OAuth token expired
      const connectUrlTree = {
        toString: () => '/profile/mercadopago-connect?returnUrl=/cars/publish',
      } as any;

      oauthService.canPublishCars.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(connectUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(connectUrlTree);
    });

    it('should handle owner who disconnected MercadoPago', async () => {
      // Arrange - User previously had MercadoPago but disconnected
      const connectUrlTree = {
        toString: () => '/profile/mercadopago-connect?returnUrl=/cars/publish',
      } as any;

      oauthService.canPublishCars.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(connectUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(connectUrlTree);
    });
  });

  // ============================================================================
  // RETURN URL TESTS
  // ============================================================================

  describe('Return URL Handling', () => {
    it('should preserve return URL in redirect', async () => {
      // Arrange
      const connectUrlTree = {
        toString: () => '/profile/mercadopago-connect?returnUrl=/cars/publish',
      } as any;

      oauthService.canPublishCars.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(connectUrlTree);

      // Act
      await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/profile/mercadopago-connect'],
        jasmine.objectContaining({
          queryParams: { returnUrl: '/cars/publish' },
        }),
      );
    });

    it('should use current router URL as return URL', async () => {
      // Arrange
      const customUrl = '/cars/edit/123';
      router.url = customUrl;

      const connectUrlTree = {
        toString: () => `/profile/mercadopago-connect?returnUrl=${customUrl}`,
      } as any;

      oauthService.canPublishCars.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(connectUrlTree);

      // Act
      await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(router.createUrlTree).toHaveBeenCalledWith(
        ['/profile/mercadopago-connect'],
        jasmine.objectContaining({
          queryParams: { returnUrl: customUrl },
        }),
      );
    });
  });

  // ============================================================================
  // CONCURRENCY TESTS
  // ============================================================================

  describe('Concurrent Checks', () => {
    it('should handle multiple concurrent canPublishCars checks', async () => {
      // Arrange
      oauthService.canPublishCars.and.returnValue(Promise.resolve(true));

      // Act
      const results = await Promise.all([
        TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, [])),
        TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, [])),
        TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, [])),
      ]);

      // Assert
      expect(results.every((r) => r === true)).toBe(true);
      expect(oauthService.canPublishCars).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration with OAuth Flow', () => {
    it('should work in conjunction with OAuth callback', async () => {
      // Arrange - User just completed OAuth, now can publish
      oauthService.canPublishCars.and.returnValue(Promise.resolve(true));

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(true);
    });

    it('should block access before OAuth completion', async () => {
      // Arrange - User in middle of OAuth flow
      const connectUrlTree = {
        toString: () => '/profile/mercadopago-connect?returnUrl=/cars/publish',
      } as any;

      oauthService.canPublishCars.and.returnValue(Promise.resolve(false));
      router.createUrlTree.and.returnValue(connectUrlTree);

      // Act
      const result = await TestBed.runInInjectionContext(() => MercadoPagoGuard(null as any, []));

      // Assert
      expect(result).toBe(connectUrlTree);
    });
  });
});
