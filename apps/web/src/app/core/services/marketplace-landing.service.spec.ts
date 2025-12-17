import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketplaceLandingService } from './marketplace-landing.service';

describe('MarketplaceLandingService', () => {
  let component: MarketplaceLandingService;
  let fixture: ComponentFixture<MarketplaceLandingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceLandingService],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceLandingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
