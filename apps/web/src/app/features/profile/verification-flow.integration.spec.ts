import { TestBed } from '@angular/core/testing';
import { IdentityLevelService, type VerificationProgress } from '../../core/services/identity-level.service';
import { EmailVerificationService } from '../../core/services/email-verification.service';
import { PhoneVerificationService } from '../../core/services/phone-verification.service';
import { FaceVerificationService } from '../../core/services/face-verification.service';
import { VerificationStateService } from '../../core/services/verification-state.service';
import { SupabaseClientService } from '../../core/services/supabase-client.service';

/**
 * Integration test for the complete verification flow
 * Tests the progression through all 3 verification levels:
 * Level 1: Email + Phone → Level 2: Documents → Level 3: Facial Biometrics
 */
describe('Verification Flow Integration', () => {
  let identityLevelService: IdentityLevelService;
  let emailVerificationService: EmailVerificationService;
  let phoneVerificationService: PhoneVerificationService;
  let faceVerificationService: FaceVerificationService;
  let verificationStateService: VerificationStateService;
  let supabaseMock: any;

  const mockUserId = 'test-user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    phone: null,
    email_confirmed_at: null,
    phone_confirmed_at: null,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
  };

  // Initial state: No verification
  const mockProgressLevel0: VerificationProgress = {
    success: true,
    user_id: mockUserId,
    current_level: 1,
    progress_percentage: 0,
    requirements: {
      level_1: { email_verified: false, phone_verified: false, completed: false },
      level_2: { document_verified: false, driver_license_verified: false, completed: false, ai_score: null },
      level_3: { selfie_verified: false, completed: false, face_match_score: null },
    },
    missing_requirements: [
      { requirement: 'email', label: 'Email verificado', level: 1 },
      { requirement: 'phone', label: 'Teléfono verificado', level: 1 },
      { requirement: 'document', label: 'Documento de identidad', level: 2 },
      { requirement: 'driver_license', label: 'Licencia de conducir', level: 2 },
      { requirement: 'selfie', label: 'Selfie verificado', level: 3 },
    ],
    can_access_level_2: false,
    can_access_level_3: false,
  };

  // After email verification
  const mockProgressLevel1EmailOnly: VerificationProgress = {
    ...mockProgressLevel0,
    progress_percentage: 20,
    requirements: {
      ...mockProgressLevel0.requirements,
      level_1: { email_verified: true, phone_verified: false, completed: false },
    },
    missing_requirements: mockProgressLevel0.missing_requirements.filter(r => r.requirement !== 'email'),
  };

  // After phone verification (Level 1 complete)
  const mockProgressLevel1Complete: VerificationProgress = {
    ...mockProgressLevel0,
    progress_percentage: 40,
    requirements: {
      ...mockProgressLevel0.requirements,
      level_1: { email_verified: true, phone_verified: true, completed: true },
    },
    missing_requirements: mockProgressLevel0.missing_requirements.filter(
      r => r.requirement !== 'email' && r.requirement !== 'phone'
    ),
    can_access_level_2: true,
  };

  // After document verification (Level 2 complete)
  const mockProgressLevel2Complete: VerificationProgress = {
    ...mockProgressLevel0,
    current_level: 2,
    progress_percentage: 80,
    requirements: {
      level_1: { email_verified: true, phone_verified: true, completed: true },
      level_2: { document_verified: true, driver_license_verified: true, completed: true, ai_score: 85 },
      level_3: { selfie_verified: false, completed: false, face_match_score: null },
    },
    missing_requirements: [
      { requirement: 'selfie', label: 'Selfie verificado', level: 3 },
    ],
    can_access_level_2: true,
    can_access_level_3: true,
  };

  // After selfie verification (Level 3 complete - fully verified)
  const mockProgressLevel3Complete: VerificationProgress = {
    ...mockProgressLevel0,
    current_level: 3,
    progress_percentage: 100,
    requirements: {
      level_1: { email_verified: true, phone_verified: true, completed: true },
      level_2: { document_verified: true, driver_license_verified: true, completed: true, ai_score: 85 },
      level_3: { selfie_verified: true, completed: true, face_match_score: 90 },
    },
    missing_requirements: [],
    can_access_level_2: true,
    can_access_level_3: true,
  };

  beforeEach(() => {
    let currentProgress = mockProgressLevel0;

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
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.resolveTo({
              data: {
                user_id: mockUserId,
                current_level: currentProgress.current_level,
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
      rpc: jasmine.createSpy('rpc').and.callFake((fnName: string) => {
        if (fnName === 'get_verification_progress') {
          return Promise.resolve({ data: currentProgress, error: null });
        }
        return Promise.resolve({ data: { success: true }, error: null });
      }),
      storage: {
        from: jasmine.createSpy('from').and.returnValue({
          upload: jasmine.createSpy('upload').and.resolveTo({
            data: { path: 'test-user-123/selfie_123.webm' },
            error: null,
          }),
          getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({
            data: { publicUrl: 'https://storage.supabase.co/test-user-123/selfie_123.webm' },
          }),
        }),
      },
      channel: jasmine.createSpy('channel').and.returnValue({
        on: jasmine.createSpy('on').and.returnValue({
          subscribe: jasmine.createSpy('subscribe').and.returnValue(Promise.resolve({ status: 'SUBSCRIBED' })),
        }),
      }),
      removeChannel: jasmine.createSpy('removeChannel'),
    };

    TestBed.configureTestingModule({
      providers: [
        IdentityLevelService,
        EmailVerificationService,
        PhoneVerificationService,
        FaceVerificationService,
        VerificationStateService,
        {
          provide: SupabaseClientService,
          useValue: {
            getClient: () => supabaseMock,
          },
        },
      ],
    });

    identityLevelService = TestBed.inject(IdentityLevelService);
    emailVerificationService = TestBed.inject(EmailVerificationService);
    phoneVerificationService = TestBed.inject(PhoneVerificationService);
    faceVerificationService = TestBed.inject(FaceVerificationService);
    verificationStateService = TestBed.inject(VerificationStateService);

    // Helper to update progress state
    (window as any).updateProgress = (progress: VerificationProgress) => {
      currentProgress = progress;
    };
  });

  it('should start with Level 1 incomplete (0% progress)', async () => {
    const progress = await identityLevelService.getVerificationProgress();

    expect(progress).toBeTruthy();
    expect(progress!.current_level).toBe(1);
    expect(progress!.progress_percentage).toBe(0);
    expect(progress!.requirements.level_1.completed).toBe(false);
    expect(progress!.can_access_level_2).toBe(false);
    expect(progress!.can_access_level_3).toBe(false);
  });

  it('should progress to 20% after email verification', async () => {
    // Verify email
    (window as any).updateProgress(mockProgressLevel1EmailOnly);
    supabaseMock.auth.getUser.and.resolveTo({
      data: { user: { ...mockUser, email_confirmed_at: '2024-01-02T00:00:00.000Z' } },
      error: null,
    });

    await emailVerificationService.checkEmailStatus();
    const progress = await identityLevelService.getVerificationProgress();

    expect(emailVerificationService.status()?.isVerified).toBe(true);
    expect(progress!.progress_percentage).toBe(20);
    expect(progress!.requirements.level_1.email_verified).toBe(true);
    expect(progress!.requirements.level_1.completed).toBe(false); // Still need phone
  });

  it('should complete Level 1 (40%) after phone verification', async () => {
    // Complete email + phone
    (window as any).updateProgress(mockProgressLevel1Complete);
    supabaseMock.auth.getUser.and.resolveTo({
      data: {
        user: {
          ...mockUser,
          email_confirmed_at: '2024-01-02T00:00:00.000Z',
          phone: '+5491112345678',
          phone_confirmed_at: '2024-01-02T00:00:00.000Z',
        },
      },
      error: null,
    });

    await phoneVerificationService.checkPhoneStatus();
    const progress = await identityLevelService.getVerificationProgress();

    expect(phoneVerificationService.status()?.isVerified).toBe(true);
    expect(progress!.progress_percentage).toBe(40);
    expect(progress!.requirements.level_1.completed).toBe(true);
    expect(progress!.can_access_level_2).toBe(true);
    expect(progress!.can_access_level_3).toBe(false); // Still need Level 2
  });

  it('should complete Level 2 (80%) after document verification', async () => {
    // Complete Level 1 + Level 2
    (window as any).updateProgress(mockProgressLevel2Complete);

    const progress = await identityLevelService.getVerificationProgress();

    expect(progress!.current_level).toBe(2);
    expect(progress!.progress_percentage).toBe(80);
    expect(progress!.requirements.level_2.completed).toBe(true);
    expect(progress!.requirements.level_2.ai_score).toBe(85);
    expect(progress!.can_access_level_3).toBe(true);
  });

  it('should complete Level 3 (100%) after facial verification', async () => {
    // Complete all levels
    (window as any).updateProgress(mockProgressLevel3Complete);
    (global as any).fetch = jasmine.createSpy('fetch').and.resolveTo({
      ok: true,
      json: async () => ({
        success: true,
        face_match_score: 90,
        liveness_score: 85,
      }),
    });

    const progress = await identityLevelService.getVerificationProgress();

    expect(progress!.current_level).toBe(3);
    expect(progress!.progress_percentage).toBe(100);
    expect(progress!.requirements.level_3.completed).toBe(true);
    expect(progress!.requirements.level_3.face_match_score).toBe(90);
    expect(progress!.missing_requirements.length).toBe(0);
  });

  it('should verify complete flow from 0% to 100%', async () => {
    // Step 1: Initial state
    let progress = await identityLevelService.getVerificationProgress();
    expect(progress!.progress_percentage).toBe(0);

    // Step 2: Verify email
    (window as any).updateProgress(mockProgressLevel1EmailOnly);
    progress = await identityLevelService.getVerificationProgress();
    expect(progress!.progress_percentage).toBe(20);

    // Step 3: Verify phone
    (window as any).updateProgress(mockProgressLevel1Complete);
    progress = await identityLevelService.getVerificationProgress();
    expect(progress!.progress_percentage).toBe(40);

    // Step 4: Verify documents
    (window as any).updateProgress(mockProgressLevel2Complete);
    progress = await identityLevelService.getVerificationProgress();
    expect(progress!.progress_percentage).toBe(80);

    // Step 5: Verify face
    (window as any).updateProgress(mockProgressLevel3Complete);
    progress = await identityLevelService.getVerificationProgress();
    expect(progress!.progress_percentage).toBe(100);
    expect(progress!.current_level).toBe(3);
    expect(progress!.requirements.level_1.completed).toBe(true);
    expect(progress!.requirements.level_2.completed).toBe(true);
    expect(progress!.requirements.level_3.completed).toBe(true);
  });

  it('should enforce level access restrictions', async () => {
    // Level 1 incomplete - cannot access Level 2 or 3
    (window as any).updateProgress(mockProgressLevel0);
    let progress = await identityLevelService.getVerificationProgress();
    expect(await identityLevelService.checkLevelAccess(1)).toBe(true);
    expect(await identityLevelService.checkLevelAccess(2)).toBe(false);
    expect(await identityLevelService.checkLevelAccess(3)).toBe(false);

    // Level 1 complete - can access Level 2, not Level 3
    (window as any).updateProgress(mockProgressLevel1Complete);
    progress = await identityLevelService.getVerificationProgress();
    expect(await identityLevelService.checkLevelAccess(2)).toBe(true);
    expect(await identityLevelService.checkLevelAccess(3)).toBe(false);

    // Level 2 complete - can access Level 3
    (window as any).updateProgress(mockProgressLevel2Complete);
    progress = await identityLevelService.getVerificationProgress();
    expect(await identityLevelService.checkLevelAccess(3)).toBe(true);
  });
});
