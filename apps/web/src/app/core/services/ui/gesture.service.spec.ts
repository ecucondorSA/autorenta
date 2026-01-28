import { TestBed } from '@angular/core/testing';
import { GestureService } from '@core/services/ui/gesture.service';
import { testProviders } from '@app/testing/test-providers';

describe('GestureService', () => {
  let service: GestureService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, GestureService],
    });
    service = TestBed.inject(GestureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have configure method', () => {
    expect(typeof service.configure).toBe('function');
  });

  it('should have reset method', () => {
    expect(typeof service.reset).toBe('function');
  });
});
