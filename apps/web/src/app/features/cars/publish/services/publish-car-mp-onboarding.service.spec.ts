import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublishCarMpOnboardingService } from './publish-car-mp-onboarding.service';

describe('PublishCarMpOnboardingService', () => {
  let component: PublishCarMpOnboardingService;
  let fixture: ComponentFixture<PublishCarMpOnboardingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishCarMpOnboardingService],
    }).compileComponents();

    fixture = TestBed.createComponent(PublishCarMpOnboardingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
