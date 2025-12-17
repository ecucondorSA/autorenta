import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let component: OnboardingService;
  let fixture: ComponentFixture<OnboardingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingService],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
