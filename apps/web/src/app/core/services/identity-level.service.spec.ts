import { TestBed } from '@angular/core/testing';
import { IdentityLevelService, type VerificationProgress } from './identity-level.service';
import { SupabaseClientService } from './supabase-client.service';

describe('IdentityLevelService', () => {
  let service: IdentityLevelService;
  let supabaseMock: any;

  const mockUserId = 'test-user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
  };

  const mockIdentityLevel = {
    user_id: mockUserId,
    current_level: 1,
    email_verified_at: '2024-01-01T00:00:00.000Z',
    phone_verified_at: null,
    document_front_url: null,
    document_back_url: null,
    document_ai_score: null,
    driver_license_url: null,
    driver_license_verified_at: null,
    selfie_url: null,
    selfie_verified_at: null,
    face_match_score: null,
    liveness_score: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  const mockVerificationProgress: VerificationProgress = {
    success: true,
    user_id: mockUserId,
    current_level: 1,
    progress_percentage: 40,
    requirements: {
      level_1: {
        email_verified: true,
        phone_verified: false,
        completed: false,
      },
      level_2: {
        document_verified: false,
        driver_license_verified: false,
        completed: false,
        ai_score: null,
      },
      level_3: {
        selfie_verified: false,
        completed: false,
        face_match_score: null,
      },
    },
    missing_requirements: [
      { requirement: 'phone', label: 'Teléfono verificado', level: 1 },
      { requirement: 'document', label: 'Documento de identidad', level: 2 },
      { requirement: 'driver_license', label: 'Licencia de conducir', level: 2 },
      { requirement: 'selfie', label: 'Selfie verificado', level: 3 },
    ],
    can_access_level_2: false,
    can_access_level_3: false,
  };

  beforeEach(() => {
    supabaseMock = {
      auth: {
        getUser: jasmine.createSpy('getUser').and.resolveTo({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: mockIdentityLevel,
              error: null,
            }),
          }),
        }),
        insert: jasmine.createSpy('insert').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: mockIdentityLevel,
              error: null,
            }),
          }),
        }),
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.resolveTo({
            data: mockIdentityLevel,
            error: null,
          }),
        }),
        upsert: jasmine.createSpy('upsert').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: mockIdentityLevel,
              error: null,
            }),
          }),
        }),
      }),
      rpc: jasmine.createSpy('rpc').and.resolveTo({
        data: mockVerificationProgress,
        error: null,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        IdentityLevelService,
        {
          provide: SupabaseClientService,
          useValue: {
            getClient: () => supabaseMock,
          },
        },
      ],
    });

    service = TestBed.inject(IdentityLevelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadIdentityLevel', () => {
    it('should load identity level successfully', async () => {
      const result = await service.loadIdentityLevel();

      expect(supabaseMock.auth.getUser).toHaveBeenCalled();
      expect(supabaseMock.from).toHaveBeenCalledWith('user_identity_levels');
      expect(result).toEqual(mockIdentityLevel);
      expect(service.identityLevel()).toEqual(mockIdentityLevel);
      expect(service.loading()).toBe(false);
    });

    it('should set loading state while fetching', async () => {
      const promise = service.loadIdentityLevel();
      expect(service.loading()).toBe(true);
      await promise;
      expect(service.loading()).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      supabaseMock.from = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const result = await service.loadIdentityLevel();

      expect(result).toBeNull();
      expect(service.error()).toBe('Database error');
      expect(service.loading()).toBe(false);
    });

    it('should throw error when user is not authenticated', async () => {
      supabaseMock.auth.getUser.and.resolveTo({
        data: { user: null },
        error: null,
      });

      await expectAsync(service.loadIdentityLevel()).toBeRejectedWithError(
        'Usuario no autenticado',
      );
    });
  });

  describe('getVerificationProgress', () => {
    it('should get verification progress successfully', async () => {
      const result = await service.getVerificationProgress();

      expect(supabaseMock.rpc).toHaveBeenCalledWith('get_verification_progress');
      expect(result).toEqual(mockVerificationProgress);
      expect(service.verificationProgress()).toEqual(mockVerificationProgress);
    });

    it('should handle RPC errors', async () => {
      supabaseMock.rpc.and.resolveTo({
        data: null,
        error: { message: 'RPC error' },
      });

      const result = await service.getVerificationProgress();

      expect(result).toBeNull();
      expect(service.error()).toBe('RPC error');
    });
  });

  describe('computed values', () => {
    beforeEach(async () => {
      await service.loadIdentityLevel();
      await service.getVerificationProgress();
    });

    it('should compute currentLevel correctly', () => {
      expect(service.currentLevel()).toBe(1);
    });

    it('should compute progressPercentage correctly', () => {
      expect(service.progressPercentage()).toBe(40);
    });

    it('should compute isLevel1Complete correctly', () => {
      expect(service.isLevel1Complete()).toBe(true);
    });

    it('should compute isLevel2Complete correctly', () => {
      expect(service.isLevel2Complete()).toBe(false);
    });

    it('should compute isLevel3Complete correctly', () => {
      expect(service.isLevel3Complete()).toBe(false);
    });
  });

  describe('checkLevelAccess', () => {
    it('should return true for accessible levels', async () => {
      await service.getVerificationProgress();
      const hasAccess = await service.checkLevelAccess(1);
      expect(hasAccess).toBe(true);
    });

    it('should return false for inaccessible levels', async () => {
      await service.getVerificationProgress();
      const hasAccess = await service.checkLevelAccess(2);
      expect(hasAccess).toBe(false);
    });
  });

  describe('updateIdentityLevel', () => {
    it('should update identity level successfully', async () => {
      const updates = { phone_verified_at: '2024-01-02T00:00:00.000Z' };
      const result = await service.updateIdentityLevel(updates);

      expect(supabaseMock.from).toHaveBeenCalledWith('user_identity_levels');
      expect(result).toEqual(mockIdentityLevel);
    });

    it('should throw error when user is not authenticated', async () => {
      supabaseMock.auth.getUser.and.resolveTo({
        data: { user: null },
        error: null,
      });

      await expectAsync(service.updateIdentityLevel({ current_level: 2 })).toBeRejectedWithError(
        'Usuario no autenticado',
      );
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

  describe('invalidateCache', () => {
    it('should invalidate cache and reload', async () => {
      spyOn(service, 'loadIdentityLevel').and.resolveTo(mockIdentityLevel);
      spyOn(service, 'getVerificationProgress').and.resolveTo(mockVerificationProgress);

      await service.invalidateCache();

      expect(service.loadIdentityLevel).toHaveBeenCalled();
      expect(service.getVerificationProgress).toHaveBeenCalled();
    });
  });
});
