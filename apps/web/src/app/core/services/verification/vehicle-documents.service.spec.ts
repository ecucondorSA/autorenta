import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { VehicleDocumentsService } from '@core/services/verification/vehicle-documents.service';
import { testProviders } from '@app/testing/test-providers';

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

describe('VehicleDocumentsService', () => {
  let service: VehicleDocumentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, VehicleDocumentsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService },],
    });
    service = TestBed.inject(VehicleDocumentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have uploadDocument method', () => {
    expect(typeof service.uploadDocument).toBe('function');
  });

  it('should have updateDocument method', () => {
    expect(typeof service.updateDocument).toBe('function');
  });

  it('should have deleteDocument method', () => {
    expect(typeof service.deleteDocument).toBe('function');
  });

  it('should have getDocumentUrl method', () => {
    expect(typeof service.getDocumentUrl).toBe('function');
  });

  it('should have hasRequiredDocuments method', () => {
    expect(typeof service.hasRequiredDocuments).toBe('function');
  });

  it('should have getMissingDocuments method', () => {
    expect(typeof service.getMissingDocuments).toBe('function');
  });

  it('should have getCarDocuments method', () => {
    expect(typeof service.getCarDocuments).toBe('function');
  });

  it('should have getDocument method', () => {
    expect(typeof service.getDocument).toBe('function');
  });

  it('should have getExpiringDocuments method', () => {
    expect(typeof service.getExpiringDocuments).toBe('function');
  });

  it('should have getDocumentKindLabel method', () => {
    expect(typeof service.getDocumentKindLabel).toBe('function');
  });
});
