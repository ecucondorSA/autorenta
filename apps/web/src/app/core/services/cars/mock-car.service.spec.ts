import { TestBed } from '@angular/core/testing';
import { MockCarService } from '@core/services/cars/mock-car.service';

describe('MockCarService', () => {
  let service: MockCarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockCarService]
    });
    service = TestBed.inject(MockCarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getCars method', () => {
    expect(typeof service.getCars).toBe('function');
  });

  it('should have getCar method', () => {
    expect(typeof service.getCar).toBe('function');
  });

});
