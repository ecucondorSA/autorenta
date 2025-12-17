import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let component: PricingService;
  let fixture: ComponentFixture<PricingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingService],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
