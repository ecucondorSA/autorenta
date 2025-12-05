import { TestBed } from '@angular/core/testing';
import { VerificationService } from './verification.service';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Unit Tests for VerificationService
 * Validates security fixes from Code Review:
 *   - Fix #1: docType validation against whitelist
 *   - Fix #2: Rollback on upsert failure
 */
describe('VerificationService', () => {
  let service: VerificationService;
  let mockSupabaseClient: any;
  let mockStorage: any;
  let mockFrom: any;

  beforeEach(() => {
    // Mock storage operations
    mockStorage = {
      from: jasmine.createSpy('from').and.returnValue({
        upload: jasmine.createSpy('upload').and.returnValue(Promise.resolve({ error: null })),
        remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve({ error: null })),
      }),
    };

    // Mock DB operations
    mockFrom = jasmine.createSpy('from').and.returnValue({
      upsert: jasmine.createSpy('upsert').and.returnValue(Promise.resolve({ error: null })),
      select: jasmine.createSpy('select').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
          }),
          order: jasmine.createSpy('order').and.returnValue(Promise.resolve({ data: [], error: null })),
        }),
      }),
    });

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jasmine.createSpy('getUser').and.returnValue(
          Promise.resolve({
            data: { user: { id: 'test-user-123' } },
            error: null,
          })
        ),
      },
      storage: mockStorage,
      from: mockFrom,
      functions: {
        invoke: jasmine.createSpy('invoke').and.returnValue(Promise.resolve({ error: null })),
      },
    };

    // Mock SupabaseClientService
    const mockSupabaseClientService = {
      getClient: () => mockSupabaseClient,
    };

    TestBed.configureTestingModule({
      providers: [
        VerificationService,
        { provide: SupabaseClientService, useValue: mockSupabaseClientService },
      ],
    });

    service = TestBed.inject(VerificationService);
  });

  describe('Security Fix #1: docType Validation', () => {
    it('should accept valid document types', async () => {
      const validTypes = [
        'gov_id_front',
        'gov_id_back',
        'driver_license',
        'license_front',
        'license_back',
        'vehicle_registration',
        'vehicle_insurance',
        'utility_bill',
        'selfie',
      ];

      for (const docType of validTypes) {
        // Reset spies
        mockStorage.from().upload.calls.reset();
        mockFrom().upsert.calls.reset();

        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        await expectAsync(service.uploadDocument(mockFile, docType)).toBeResolved();
      }
    });

    it('should reject invalid document types', async () => {
      const invalidTypes = [
        'invalid_type',
        'sql_injection; DROP TABLE users;--',
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        '',
        'DRIVER_LICENSE', // Wrong case
        'government_id', // Non-existent
      ];

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      for (const docType of invalidTypes) {
        await expectAsync(service.uploadDocument(mockFile, docType))
          .toBeRejectedWithError(/Tipo de documento inválido/);
      }
    });

    it('should not call storage.upload for invalid docType', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      try {
        await service.uploadDocument(mockFile, 'malicious_type');
      } catch {
        // Expected to throw
      }

      // Verify upload was never called - validation should fail first
      expect(mockStorage.from).not.toHaveBeenCalled();
    });
  });

  describe('Security Fix #2: Rollback on Upsert Failure', () => {
    it('should delete uploaded file when upsert fails', async () => {
      // Configure mock to succeed on upload but fail on upsert
      const uploadedPath = 'test-user-123/license_front_1234567890.jpg';

      mockStorage.from = jasmine.createSpy('from').and.returnValue({
        upload: jasmine.createSpy('upload').and.returnValue(Promise.resolve({ error: null })),
        remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve({ error: null })),
      });

      mockFrom = jasmine.createSpy('from').and.returnValue({
        upsert: jasmine.createSpy('upsert').and.returnValue(
          Promise.resolve({
            error: { message: 'Database error', code: '23505' },
          })
        ),
      });

      // Re-assign to client
      mockSupabaseClient.storage = mockStorage;
      mockSupabaseClient.from = mockFrom;

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expectAsync(service.uploadDocument(mockFile, 'license_front'))
        .toBeRejectedWithError(/Error al registrar documento/);

      // Verify storage.remove was called for rollback
      expect(mockStorage.from).toHaveBeenCalledWith('verification-docs');
      expect(mockStorage.from().remove).toHaveBeenCalled();
    });

    it('should throw user-friendly error message on upsert failure', async () => {
      mockFrom = jasmine.createSpy('from').and.returnValue({
        upsert: jasmine.createSpy('upsert').and.returnValue(
          Promise.resolve({ error: { message: 'constraint violation' } })
        ),
      });
      mockSupabaseClient.from = mockFrom;

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expectAsync(service.uploadDocument(mockFile, 'license_front'))
        .toBeRejectedWithError(/Por favor, intenta de nuevo/);
    });
  });

  describe('Helper Methods', () => {
    it('getValidDocTypes should return all valid types', () => {
      const types = service.getValidDocTypes();

      expect(types).toContain('gov_id_front');
      expect(types).toContain('license_front');
      expect(types).toContain('selfie');
      expect(types.length).toBe(9);
    });

    it('isValidDocType should return true for valid types', () => {
      expect(service.isValidDocType('license_front')).toBeTrue();
      expect(service.isValidDocType('gov_id_back')).toBeTrue();
    });

    it('isValidDocType should return false for invalid types', () => {
      expect(service.isValidDocType('invalid')).toBeFalse();
      expect(service.isValidDocType('')).toBeFalse();
    });
  });

  describe('Authentication', () => {
    it('should throw if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser = jasmine.createSpy('getUser').and.returnValue(
        Promise.resolve({ data: { user: null }, error: null })
      );

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expectAsync(service.uploadDocument(mockFile, 'license_front'))
        .toBeRejectedWithError(/No autenticado/);
    });
  });
});
