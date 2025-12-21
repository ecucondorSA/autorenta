import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';

describe('ShareService', () => {
  let service: ShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ShareService]
    });
    service = TestBed.inject(ShareService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have share method', () => {
    expect(typeof service.share).toBe('function');
  });

  it('should have shareCar method', () => {
    expect(typeof service.shareCar).toBe('function');
  });

  it('should have shareApp method', () => {
    expect(typeof service.shareApp).toBe('function');
  });

  it('should have shareBooking method', () => {
    expect(typeof service.shareBooking).toBe('function');
  });

  it('should have shareFiles method', () => {
    expect(typeof service.shareFiles).toBe('function');
  });

  it('should have canShareFiles method', () => {
    expect(typeof service.canShareFiles).toBe('function');
  });

});
