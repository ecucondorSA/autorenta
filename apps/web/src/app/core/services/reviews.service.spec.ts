import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service';
import { ReviewsService } from './reviews.service';

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

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReviewsService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(ReviewsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have createReview method', () => {
    expect(typeof service.createReview).toBe('function');
  });

  it('should have getReviewsForUser method', () => {
    expect(typeof service.getReviewsForUser).toBe('function');
  });

  it('should have loadReviewsForCar method', () => {
    expect(typeof service.loadReviewsForCar).toBe('function');
  });

  it('should have getReviewsForCar method', () => {
    expect(typeof service.getReviewsForCar).toBe('function');
  });

  it('should have loadUserStats method', () => {
    expect(typeof service.loadUserStats).toBe('function');
  });

  it('should have getUserStats method', () => {
    expect(typeof service.getUserStats).toBe('function');
  });

  it('should have loadCarStats method', () => {
    expect(typeof service.loadCarStats).toBe('function');
  });

  it('should have getCarStats method', () => {
    expect(typeof service.getCarStats).toBe('function');
  });

  it('should have canReviewBooking method', () => {
    expect(typeof service.canReviewBooking).toBe('function');
  });

  it('should have flagReview method', () => {
    expect(typeof service.flagReview).toBe('function');
  });

});
