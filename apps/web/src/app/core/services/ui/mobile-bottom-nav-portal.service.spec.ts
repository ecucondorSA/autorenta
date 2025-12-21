import { TestBed } from '@angular/core/testing';
import { MobileBottomNavPortalService } from '@core/services/ui/mobile-bottom-nav-portal.service';

describe('MobileBottomNavPortalService', () => {
  let service: MobileBottomNavPortalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MobileBottomNavPortalService]
    });
    service = TestBed.inject(MobileBottomNavPortalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have create method', () => {
    expect(typeof service.create).toBe('function');
  });

  it('should have destroy method', () => {
    expect(typeof service.destroy).toBe('function');
  });

  it('should have setHidden method', () => {
    expect(typeof service.setHidden).toBe('function');
  });

});
