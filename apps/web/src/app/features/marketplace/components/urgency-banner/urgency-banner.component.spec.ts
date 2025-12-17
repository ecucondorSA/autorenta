import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UrgencyBannerComponent } from './urgency-banner.component';

describe('UrgencyBannerComponent', () => {
  let component: UrgencyBannerComponent;
  let fixture: ComponentFixture<UrgencyBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgencyBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UrgencyBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
