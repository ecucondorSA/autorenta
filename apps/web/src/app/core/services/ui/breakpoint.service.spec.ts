import { TestBed } from '@angular/core/testing';
import { BreakpointService } from '@core/services/ui/breakpoint.service';

describe('BreakpointService', () => {
  let service: BreakpointService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BreakpointService]
    });
    service = TestBed.inject(BreakpointService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have isAtLeast method', () => {
    expect(typeof service.isAtLeast).toBe('function');
  });

  it('should have isBelow method', () => {
    expect(typeof service.isBelow).toBe('function');
  });

  it('should have isBetween method', () => {
    expect(typeof service.isBetween).toBe('function');
  });

});
