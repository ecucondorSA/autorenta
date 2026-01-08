import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { FaceVerificationService } from '@core/services/verification/face-verification.service';

const mockSupabaseClient = {
  from: jasmine.createSpy('from').and.returnValue({
    select: jasmine.createSpy('select').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: [], error: null })),
      single: jasmine
        .createSpy('single')
        .and.returnValue(Promise.resolve({ data: null, error: null })),
    }),
    insert: jasmine
      .createSpy('insert')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
    update: jasmine
      .createSpy('update')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
    delete: jasmine
      .createSpy('delete')
      .and.returnValue(Promise.resolve({ data: null, error: null })),
  }),
  rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
  auth: {
    getUser: jasmine
      .createSpy('getUser')
      .and.returnValue(Promise.resolve({ data: { user: null }, error: null })),
    getSession: jasmine
      .createSpy('getSession')
      .and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jasmine
      .createSpy('onAuthStateChange')
      .and.returnValue({ data: { subscription: { unsubscribe: jasmine.createSpy() } } }),
  },
  storage: {
    from: jasmine.createSpy('from').and.returnValue({
      upload: jasmine
        .createSpy('upload')
        .and.returnValue(Promise.resolve({ data: null, error: null })),
      getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({ data: { publicUrl: '' } }),
    }),
  },
};

const mockSupabaseService = {
  client: mockSupabaseClient,
  from: mockSupabaseClient.from,
  rpc: mockSupabaseClient.rpc,
  auth: mockSupabaseClient.auth,
  storage: mockSupabaseClient.storage,
};

describe('FaceVerificationService', () => {
  let service: FaceVerificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FaceVerificationService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },
      ],
    });
    service = TestBed.inject(FaceVerificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have checkFaceVerificationStatus method', () => {
    expect(typeof service.checkFaceVerificationStatus).toBe('function');
  });

  it('should have uploadSelfieVideo method', () => {
    expect(typeof service.uploadSelfieVideo).toBe('function');
  });

  it('should have verifyFace method', () => {
    expect(typeof service.verifyFace).toBe('function');
  });

  it('should have getFaceMatchScore method', () => {
    expect(typeof service.getFaceMatchScore).toBe('function');
  });

  it('should have getLivenessScore method', () => {
    expect(typeof service.getLivenessScore).toBe('function');
  });

  it('should have deleteSelfieVideo method', () => {
    expect(typeof service.deleteSelfieVideo).toBe('function');
  });

  it('should have clearError method', () => {
    expect(typeof service.clearError).toBe('function');
  });
});
