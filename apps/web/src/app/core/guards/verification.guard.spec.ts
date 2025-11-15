import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { VerificationGuard, HasMissingDocsGuard, VerificationStatusResolver } from './verification.guard';
import { VerificationService } from '../services/verification.service';
import { signal } from '@angular/core';

describe('Verification Guards', () => {
  let verificationService: jasmine.SpyObj<VerificationService>;
  let router: jasmine.SpyObj<Router>;

  const mockVerifiedStatus = [
    {
      role: 'owner' as const,
      status: 'VERIFICADO' as const,
      missing_docs: [],
      created_at: '2025-01-01',
    },
  ];

  const mockPendingStatus = [
    {
      role: 'owner' as const,
      status: 'PENDIENTE' as const,
      missing_docs: ['driver_license', 'id_front'],
      created_at: '2025-01-01',
    },
  ];

  beforeEach(() => {
    const verificationServiceSpy = jasmine.createSpyObj(
      'VerificationService',
      ['loadStatuses'],
      {
        statuses: signal(mockVerifiedStatus),
      },
    );

    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        VerificationGuard,
        HasMissingDocsGuard,
        VerificationStatusResolver,
        { provide: VerificationService, useValue: verificationServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    verificationService = TestBed.inject(VerificationService) as jasmine.SpyObj<VerificationService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  // ============================================================================
  // VERIFICATION GUARD TESTS
  // ============================================================================

  describe('VerificationGuard', () => {
    let guard: VerificationGuard;

    beforeEach(() => {
      guard = TestBed.inject(VerificationGuard);
    });

    it('should be created', () => {
      expect(guard).toBeTruthy();
    });

    it('should allow access when owner status is VERIFICADO', async () => {
      // Arrange
      Object.defineProperty(verificationService, 'statuses', {
        value: signal(mockVerifiedStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(true);
      expect(verificationService.loadStatuses).toHaveBeenCalled();
    });

    it('should redirect to verification page when owner status is not VERIFICADO', async () => {
      // Arrange
      Object.defineProperty(verificationService, 'statuses', {
        value: signal(mockPendingStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());
      router.navigate.and.returnValue(Promise.resolve(true));

      // Act
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/verification']);
    });

    it('should redirect when owner status is RECHAZADO', async () => {
      // Arrange
      const rejectedStatus = [
        {
          role: 'owner' as const,
          status: 'RECHAZADO' as const,
          missing_docs: [],
          created_at: '2025-01-01',
        },
      ];

      Object.defineProperty(verificationService, 'statuses', {
        value: signal(rejectedStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());
      router.navigate.and.returnValue(Promise.resolve(true));

      // Act
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/verification']);
    });

    it('should redirect when no owner status exists', async () => {
      // Arrange
      const emptyStatus: any[] = [];

      Object.defineProperty(verificationService, 'statuses', {
        value: signal(emptyStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());
      router.navigate.and.returnValue(Promise.resolve(true));

      // Act
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/verification']);
    });

    it('should only check owner role status', async () => {
      // Arrange - User has renter status but not owner
      const renterOnlyStatus = [
        {
          role: 'renter' as const,
          status: 'VERIFICADO' as const,
          missing_docs: [],
          created_at: '2025-01-01',
        },
      ];

      Object.defineProperty(verificationService, 'statuses', {
        value: signal(renterOnlyStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());
      router.navigate.and.returnValue(Promise.resolve(true));

      // Act
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/verification']);
    });

    it('should handle multiple statuses and find owner', async () => {
      // Arrange - User has both renter and owner statuses
      const multipleStatuses = [
        {
          role: 'renter' as const,
          status: 'VERIFICADO' as const,
          missing_docs: [],
          created_at: '2025-01-01',
        },
        {
          role: 'owner' as const,
          status: 'VERIFICADO' as const,
          missing_docs: [],
          created_at: '2025-01-01',
        },
      ];

      Object.defineProperty(verificationService, 'statuses', {
        value: signal(multipleStatuses),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // HAS MISSING DOCS GUARD TESTS
  // ============================================================================

  describe('HasMissingDocsGuard', () => {
    let guard: HasMissingDocsGuard;

    beforeEach(() => {
      guard = TestBed.inject(HasMissingDocsGuard);
    });

    it('should be created', () => {
      expect(guard).toBeTruthy();
    });

    it('should return true when user has missing docs', async () => {
      // Arrange
      Object.defineProperty(verificationService, 'statuses', {
        value: signal(mockPendingStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await guard.hasMissingDocs();

      // Assert
      expect(result).toBe(true);
      expect(verificationService.loadStatuses).toHaveBeenCalled();
    });

    it('should return false when user has no missing docs', async () => {
      // Arrange
      Object.defineProperty(verificationService, 'statuses', {
        value: signal(mockVerifiedStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await guard.hasMissingDocs();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle empty missing_docs array', async () => {
      // Arrange
      const statusWithEmptyDocs = [
        {
          role: 'owner' as const,
          status: 'VERIFICADO' as const,
          missing_docs: [],
          created_at: '2025-01-01',
        },
      ];

      Object.defineProperty(verificationService, 'statuses', {
        value: signal(statusWithEmptyDocs),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await guard.hasMissingDocs();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle null/undefined missing_docs', async () => {
      // Arrange
      const statusWithNullDocs = [
        {
          role: 'owner' as const,
          status: 'VERIFICADO' as const,
          missing_docs: undefined,
          created_at: '2025-01-01',
        },
      ];

      Object.defineProperty(verificationService, 'statuses', {
        value: signal(statusWithNullDocs),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await guard.hasMissingDocs();

      // Assert
      expect(result).toBe(false); // Treats undefined as no missing docs
    });

    it('should return true when any status has missing docs', async () => {
      // Arrange - Multiple statuses, one with missing docs
      const mixedStatuses = [
        {
          role: 'renter' as const,
          status: 'VERIFICADO' as const,
          missing_docs: [],
          created_at: '2025-01-01',
        },
        {
          role: 'owner' as const,
          status: 'PENDIENTE' as const,
          missing_docs: ['driver_license'],
          created_at: '2025-01-01',
        },
      ];

      Object.defineProperty(verificationService, 'statuses', {
        value: signal(mixedStatuses),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await guard.hasMissingDocs();

      // Assert
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // VERIFICATION STATUS RESOLVER TESTS
  // ============================================================================

  describe('VerificationStatusResolver', () => {
    let resolver: VerificationStatusResolver;

    beforeEach(() => {
      resolver = TestBed.inject(VerificationStatusResolver);
    });

    it('should be created', () => {
      expect(resolver).toBeTruthy();
    });

    it('should load and return verification statuses', async () => {
      // Arrange
      Object.defineProperty(verificationService, 'statuses', {
        value: signal(mockVerifiedStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await resolver.resolve();

      // Assert
      expect(result).toEqual(mockVerifiedStatus);
      expect(verificationService.loadStatuses).toHaveBeenCalled();
    });

    it('should load statuses before returning', async () => {
      // Arrange
      let loadStatusesCalled = false;
      let statusesAccessed = false;

      verificationService.loadStatuses.and.callFake(async () => {
        loadStatusesCalled = true;
      });

      Object.defineProperty(verificationService, 'statuses', {
        get: () => {
          expect(loadStatusesCalled).toBe(true); // Ensure loadStatuses called first
          statusesAccessed = true;
          return signal(mockVerifiedStatus);
        },
      });

      // Act
      await resolver.resolve();

      // Assert
      expect(loadStatusesCalled).toBe(true);
      expect(statusesAccessed).toBe(true);
    });

    it('should return empty array if no statuses exist', async () => {
      // Arrange
      Object.defineProperty(verificationService, 'statuses', {
        value: signal([]),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await resolver.resolve();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle errors from loadStatuses', async () => {
      // Arrange
      verificationService.loadStatuses.and.returnValue(
        Promise.reject(new Error('Failed to load statuses')),
      );

      // Act & Assert
      await expectAsync(resolver.resolve()).toBeRejectedWithError('Failed to load statuses');
    });
  });

  // ============================================================================
  // REAL-WORLD SCENARIO TESTS
  // ============================================================================

  describe('Real-World Scenarios', () => {
    let guard: VerificationGuard;

    beforeEach(() => {
      guard = TestBed.inject(VerificationGuard);
    });

    it('should handle owner trying to publish car without verification', async () => {
      // Arrange - Owner hasn't completed verification
      Object.defineProperty(verificationService, 'statuses', {
        value: signal(mockPendingStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());
      router.navigate.and.returnValue(Promise.resolve(true));

      // Act
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/verification']);
    });

    it('should allow verified owner to publish car', async () => {
      // Arrange - Owner has completed verification
      Object.defineProperty(verificationService, 'statuses', {
        value: signal(mockVerifiedStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle owner with rejected verification trying to publish', async () => {
      // Arrange - Owner verification was rejected
      const rejectedStatus = [
        {
          role: 'owner' as const,
          status: 'RECHAZADO' as const,
          missing_docs: [],
          created_at: '2025-01-01',
        },
      ];

      Object.defineProperty(verificationService, 'statuses', {
        value: signal(rejectedStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());
      router.navigate.and.returnValue(Promise.resolve(true));

      // Act
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/verification']);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    it('should work with resolver to pre-load statuses', async () => {
      // Arrange
      const resolver = TestBed.inject(VerificationStatusResolver);
      const guard = TestBed.inject(VerificationGuard);

      Object.defineProperty(verificationService, 'statuses', {
        value: signal(mockVerifiedStatus),
        writable: true,
      });

      verificationService.loadStatuses.and.returnValue(Promise.resolve());

      // Act - Resolver loads statuses first
      await resolver.resolve();

      // Act - Guard uses pre-loaded statuses
      const result = await guard.canMatch(null as any, []);

      // Assert
      expect(result).toBe(true);
      expect(verificationService.loadStatuses).toHaveBeenCalledTimes(2); // Once by resolver, once by guard
    });
  });
});
