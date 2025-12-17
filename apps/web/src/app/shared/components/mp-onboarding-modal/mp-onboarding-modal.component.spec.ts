import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MpOnboardingModalComponent } from './mp-onboarding-modal.component';

describe('MpOnboardingModalComponent', () => {
  let component: MpOnboardingModalComponent;
  let fixture: ComponentFixture<MpOnboardingModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MpOnboardingModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MpOnboardingModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
