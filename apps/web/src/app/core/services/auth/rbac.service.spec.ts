import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { RBACService } from '@core/services/auth/rbac.service';

const mockSupabaseClient = {
  from: jasmine.createSpy('from').and.returnValue({
    select: jasmine.createSpy('select').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: [], error: null })),
      single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
    }),
    insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ data: null, error: null })),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve({ data: null, error: null })),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({ data: null, error: null })),
  }),
  rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
  auth: {
    getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve({ data: { user: null }, error: null })),
    getSession: jasmine.createSpy('getSession').and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({ data: { subscription: { unsubscribe: jasmine.createSpy() } } }),
  },
  storage: {
    from: jasmine.createSpy('from').and.returnValue({
      upload: jasmine.createSpy('upload').and.returnValue(Promise.resolve({ data: null, error: null })),
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

describe('RBACService', () => {
  let service: RBACService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RBACService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(RBACService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have loadUserRoles method', () => {
    expect(typeof service.loadUserRoles).toBe('function');
  });

  it('should have hasRole method', () => {
    expect(typeof service.hasRole).toBe('function');
  });

  it('should have hasAnyRole method', () => {
    expect(typeof service.hasAnyRole).toBe('function');
  });

  it('should have hasAllRoles method', () => {
    expect(typeof service.hasAllRoles).toBe('function');
  });

  it('should have checkIsAdmin method', () => {
    expect(typeof service.checkIsAdmin).toBe('function');
  });

  it('should have logAction method', () => {
    expect(typeof service.logAction).toBe('function');
  });

  it('should have getAuditLogs method', () => {
    expect(typeof service.getAuditLogs).toBe('function');
  });

  it('should have grantRole method', () => {
    expect(typeof service.grantRole).toBe('function');
  });

  it('should have revokeRole method', () => {
    expect(typeof service.revokeRole).toBe('function');
  });

  it('should have getRoleDisplayName method', () => {
    expect(typeof service.getRoleDisplayName).toBe('function');
  });

});
