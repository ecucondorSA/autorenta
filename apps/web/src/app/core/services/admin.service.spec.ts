import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { AdminService } from './admin.service';

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

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(AdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have isAdmin method', () => {
    expect(typeof service.isAdmin).toBe('function');
  });

  it('should have hasRole method', () => {
    expect(typeof service.hasRole).toBe('function');
  });

  it('should have hasPermission method', () => {
    expect(typeof service.hasPermission).toBe('function');
  });

  it('should have getAdminRoles method', () => {
    expect(typeof service.getAdminRoles).toBe('function');
  });

  it('should have getPermissions method', () => {
    expect(typeof service.getPermissions).toBe('function');
  });

  it('should have logAction method', () => {
    expect(typeof service.logAction).toBe('function');
  });

  it('should have getAuditLog method', () => {
    expect(typeof service.getAuditLog).toBe('function');
  });

  it('should have grantAdminRole method', () => {
    expect(typeof service.grantAdminRole).toBe('function');
  });

  it('should have revokeAdminRole method', () => {
    expect(typeof service.revokeAdminRole).toBe('function');
  });

  it('should have listAdminUsers method', () => {
    expect(typeof service.listAdminUsers).toBe('function');
  });

});
