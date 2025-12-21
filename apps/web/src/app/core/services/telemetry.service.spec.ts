import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { TelemetryService } from './telemetry.service';

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

describe('TelemetryService', () => {
  let service: TelemetryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TelemetryService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(TelemetryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have stopCollection method', () => {
    expect(typeof service.stopCollection).toBe('function');
  });

  it('should have recordTelemetry method', () => {
    expect(typeof service.recordTelemetry).toBe('function');
  });

  it('should have getHistory method', () => {
    expect(typeof service.getHistory).toBe('function');
  });

  it('should have getAverage method', () => {
    expect(typeof service.getAverage).toBe('function');
  });

  it('should have getInsights method', () => {
    expect(typeof service.getInsights).toBe('function');
  });

  it('should have getTripScore method', () => {
    expect(typeof service.getTripScore).toBe('function');
  });

  it('should have startCollection method', () => {
    expect(typeof service.startCollection).toBe('function');
  });

  it('should have recordHardBrake method', () => {
    expect(typeof service.recordHardBrake).toBe('function');
  });

  it('should have recordSpeedViolation method', () => {
    expect(typeof service.recordSpeedViolation).toBe('function');
  });

  it('should have updateDistance method', () => {
    expect(typeof service.updateDistance).toBe('function');
  });

});
