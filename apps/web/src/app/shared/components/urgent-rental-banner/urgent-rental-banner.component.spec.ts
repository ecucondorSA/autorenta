import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UrgentRentalBannerComponent } from './urgent-rental-banner.component';

describe('UrgentRentalBannerComponent', () => {
  let component: UrgentRentalBannerComponent;
  let fixture: ComponentFixture<UrgentRentalBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentRentalBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UrgentRentalBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
