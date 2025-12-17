import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicPricingService } from './dynamic-pricing.service';

describe('DynamicPricingService', () => {
  let component: DynamicPricingService;
  let fixture: ComponentFixture<DynamicPricingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicPricingService],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicPricingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
