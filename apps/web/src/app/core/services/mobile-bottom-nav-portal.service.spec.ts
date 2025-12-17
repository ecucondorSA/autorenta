import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileBottomNavPortalService } from './mobile-bottom-nav-portal.service';

describe('MobileBottomNavPortalService', () => {
  let component: MobileBottomNavPortalService;
  let fixture: ComponentFixture<MobileBottomNavPortalService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileBottomNavPortalService],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileBottomNavPortalService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
