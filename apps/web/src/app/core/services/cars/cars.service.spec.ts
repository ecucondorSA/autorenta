import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { CarsService } from './cars.service';

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

describe('CarsService', () => {
  let service: CarsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CarsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(CarsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have createCar method', () => {
    expect(typeof service.createCar).toBe('function');
  });

  it('should have uploadPhoto method', () => {
    expect(typeof service.uploadPhoto).toBe('function');
  });

  it('should have getCarPhotos method', () => {
    expect(typeof service.getCarPhotos).toBe('function');
  });

  it('should have listActiveCars method', () => {
    expect(typeof service.listActiveCars).toBe('function');
  });

  it('should have getCarById method', () => {
    expect(typeof service.getCarById).toBe('function');
  });

  it('should have listMyCars method', () => {
    expect(typeof service.listMyCars).toBe('function');
  });

  it('should have getMyCars method', () => {
    expect(typeof service.getMyCars).toBe('function');
  });

  it('should have getBlockedDateRanges method', () => {
    expect(typeof service.getBlockedDateRanges).toBe('function');
  });

  it('should have deleteCar method', () => {
    expect(typeof service.deleteCar).toBe('function');
  });

  it('should have updateCarStatus method', () => {
    expect(typeof service.updateCarStatus).toBe('function');
  });

});
