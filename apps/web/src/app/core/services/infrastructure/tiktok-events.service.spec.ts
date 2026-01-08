import { TestBed } from '@angular/core/testing';
import { TikTokEventsService } from '@core/services/infrastructure/tiktok-events.service';

describe('TikTokEventsService', () => {
  let service: TikTokEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TikTokEventsService],
    });
    service = TestBed.inject(TikTokEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have trackViewContent method', () => {
    expect(typeof service.trackViewContent).toBe('function');
  });

  it('should have trackAddToWishlist method', () => {
    expect(typeof service.trackAddToWishlist).toBe('function');
  });

  it('should have trackSearch method', () => {
    expect(typeof service.trackSearch).toBe('function');
  });

  it('should have trackAddPaymentInfo method', () => {
    expect(typeof service.trackAddPaymentInfo).toBe('function');
  });

  it('should have trackAddToCart method', () => {
    expect(typeof service.trackAddToCart).toBe('function');
  });

  it('should have trackInitiateCheckout method', () => {
    expect(typeof service.trackInitiateCheckout).toBe('function');
  });

  it('should have trackPlaceAnOrder method', () => {
    expect(typeof service.trackPlaceAnOrder).toBe('function');
  });

  it('should have trackCompleteRegistration method', () => {
    expect(typeof service.trackCompleteRegistration).toBe('function');
  });

  it('should have trackPurchase method', () => {
    expect(typeof service.trackPurchase).toBe('function');
  });
});
