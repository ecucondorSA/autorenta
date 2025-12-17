import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketplaceOnboardingService } from './marketplace-onboarding.service';

describe('MarketplaceOnboardingService', () => {
  let component: MarketplaceOnboardingService;
  let fixture: ComponentFixture<MarketplaceOnboardingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceOnboardingService],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceOnboardingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
