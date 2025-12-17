import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SmartOnboardingComponent } from './smart-onboarding.component';

describe('SmartOnboardingComponent', () => {
  let component: SmartOnboardingComponent;
  let fixture: ComponentFixture<SmartOnboardingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmartOnboardingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SmartOnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
