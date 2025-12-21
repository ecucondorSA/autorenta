import { TestBed } from '@angular/core/testing';
import { GestureService } from './gesture.service';

describe('GestureService', () => {
  let service: GestureService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GestureService]
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
