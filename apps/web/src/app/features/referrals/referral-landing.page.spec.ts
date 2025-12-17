import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReferralLandingPage } from './referral-landing.page';

describe('ReferralLandingPage', () => {
  let component: ReferralLandingPage;
  let fixture: ComponentFixture<ReferralLandingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferralLandingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ReferralLandingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
