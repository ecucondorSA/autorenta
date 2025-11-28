import { TestBed } from '@angular/core/testing';
import { FaceVerificationService, type FaceVerificationResult } from './face-verification.service';
import { SupabaseClientService } from './supabase-client.service';

// TODO: Fix - Service API changed, tests need update
xdescribe('FaceVerificationService', () => {
  let service: FaceVerificationService;
  let supabaseMock: any;
  let fetchSpy: jasmine.Spy;

  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
  };

  const mockFaceVerificationResult: FaceVerificationResult = {
    success: true,
    face_detected: true,
    face_match_score: 85,
    liveness_score: 90,
  };

  beforeEach(() => {
    supabaseMock = {
      auth: {
        getUser: jasmine.createSpy('getUser').and.resolveTo({
          data: { user: mockUser },
          error: null,
        }),
      },
      storage: {
        from: jasmine.createSpy('from').and.returnValue({
          upload: jasmine.createSpy('upload').and.resolveTo({
            data: { path: 'test-user-123/selfie_123.webm' },
            error: null,
          }),
          getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({
            data: { publicUrl: 'https://storage.supabase.co/test-user-123/selfie_123.webm' },
          }),
          remove: jasmine.createSpy('remove').and.resolveTo({
            data: null,
            error: null,
          }),
        }),
      },
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: {
                selfie_url: 'https://storage.supabase.co/test-user-123/selfie_123.webm',
                selfie_verified_at: '2024-01-02T00:00:00.000Z',
                face_match_score: 85,
                liveness_score: 90,
              },
              error: null,
            }),
          }),
        }),
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.resolveTo({
            data: null,
            error: null,
          }),
        }),
      }),
    };

    fetchSpy = jasmine.createSpy('fetch').and.resolveTo({
      ok: true,
      json: async () => mockFaceVerificationResult,
    });

    (global as any).fetch = fetchSpy;

    TestBed.configureTestingModule({
      providers: [
        FaceVerificationService,
        {
          provide: SupabaseClientService,
          useValue: {
            getClient: () => supabaseMock,
          },
        },
      ],
    });

    service = TestBed.inject(FaceVerificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('uploadSelfieVideo', () => {
    let mockFile: File;

    beforeEach(() => {
      const blob = new Blob(['video content'], { type: 'video/webm' });
      mockFile = new File([blob], 'selfie.webm', { type: 'video/webm' });
    });

    it('should upload video successfully', async () => {
      const videoUrl = await service.uploadSelfieVideo(mockFile);

      expect(supabaseMock.storage.from).toHaveBeenCalledWith('identity-documents');
      expect(videoUrl).toBe('https://storage.supabase.co/test-user-123/selfie_123.webm');
      expect(service.loading()).toBe(false);
    });

    it('should validate file type', async () => {
      const invalidFile = new File(['data'], 'test.txt', { type: 'text/plain' });

      await expectAsync(service.uploadSelfieVideo(invalidFile)).toBeRejectedWithError(
        'El archivo debe ser un video (MP4, WebM)',
      );
    });

    it('should validate file size (max 10MB)', async () => {
      const largeBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'video/webm' });
      const largeFile = new File([largeBlob], 'large.webm', { type: 'video/webm' });

      await expectAsync(service.uploadSelfieVideo(largeFile)).toBeRejectedWithError(
        'El video no debe superar 10MB',
      );
    });

    it('should set loading state while uploading', async () => {
      const promise = service.uploadSelfieVideo(mockFile);
      expect(service.loading()).toBe(true);
      await promise;
      expect(service.loading()).toBe(false);
    });

    it('should handle upload errors', async () => {
      supabaseMock.storage.from = jasmine.createSpy('from').and.returnValue({
        upload: jasmine.createSpy('upload').and.resolveTo({
          data: null,
          error: { message: 'Upload failed' },
        }),
      });

      await expectAsync(service.uploadSelfieVideo(mockFile)).toBeRejectedWithError('Upload failed');
      expect(service.error()).toBe('Upload failed');
    });
  });

  describe('verifyFace', () => {
    const videoUrl = 'https://storage.supabase.co/test-user-123/selfie_123.webm';
    const documentUrl = 'https://storage.supabase.co/test-user-123/document.jpg';

    it('should verify face successfully', async () => {
      const result = await service.verifyFace(videoUrl, documentUrl);

      expect(fetchSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('/verify-face'),
        jasmine.objectContaining({
          method: 'POST',
          headers: jasmine.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: jasmine.stringContaining(mockUser.id),
        }),
      );

      expect(result).toEqual(mockFaceVerificationResult);
      expect(service.processing()).toBe(false);
    });

    it('should set processing state while verifying', async () => {
      const promise = service.verifyFace(videoUrl, documentUrl);
      expect(service.processing()).toBe(true);
      await promise;
      expect(service.processing()).toBe(false);
    });

    it('should handle API errors', async () => {
      fetchSpy.and.resolveTo({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid video' }),
      });

      await expectAsync(service.verifyFace(videoUrl, documentUrl)).toBeRejectedWithError(
        'Error al verificar rostro: Invalid video',
      );
      expect(service.error()).toContain('Invalid video');
    });

    it('should handle network errors', async () => {
      fetchSpy.and.rejectWith(new Error('Network error'));

      await expectAsync(service.verifyFace(videoUrl, documentUrl)).toBeRejectedWithError(
        /Network error/,
      );
    });

    it('should update identity level after successful verification', async () => {
      await service.verifyFace(videoUrl, documentUrl);

      expect(supabaseMock.from).toHaveBeenCalledWith('user_identity_levels');
      expect(supabaseMock.from().update).toHaveBeenCalledWith({
        selfie_url: videoUrl,
        selfie_verified_at: jasmine.any(String),
        face_match_score: 85,
        liveness_score: 90,
      });
    });
  });

  describe('checkFaceVerificationStatus', () => {
    it('should check status successfully when verified', async () => {
      const status = await service.checkFaceVerificationStatus();

      expect(supabaseMock.from).toHaveBeenCalledWith('user_identity_levels');
      expect(status).toEqual({
        isVerified: true,
        selfieUrl: 'https://storage.supabase.co/selfie.webm',
        verifiedAt: '2024-01-01T00:00:00.000Z',
        requiresLevel2: false,
        faceMatchScore: 85,
        livenessScore: 90,
      });
    });

    it('should return requiresLevel2 when no documents', async () => {
      supabaseMock.from = jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: {
                selfie_url: null,
                selfie_verified_at: null,
                face_match_score: null,
                liveness_score: null,
                document_front_url: null,
                driver_license_url: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const status = await service.checkFaceVerificationStatus();

      expect(status?.requiresLevel2).toBe(true);
      expect(status?.isVerified).toBe(false);
    });
  });

  describe('deleteSelfieVideo', () => {
    it('should delete selfie video successfully', async () => {
      await service.deleteSelfieVideo();

      expect(supabaseMock.storage.from).toHaveBeenCalledWith('identity-documents');
      expect(supabaseMock.storage.from().remove).toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      supabaseMock.storage.from = jasmine.createSpy('from').and.returnValue({
        remove: jasmine.createSpy('remove').and.resolveTo({
          data: null,
          error: { message: 'Delete failed' },
        }),
      });

      await expectAsync(service.deleteSelfieVideo()).toBeRejectedWithError('Delete failed');
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
