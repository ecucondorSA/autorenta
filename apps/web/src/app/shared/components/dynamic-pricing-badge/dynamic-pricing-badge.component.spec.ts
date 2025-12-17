import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicPricingBadgeComponent } from './dynamic-pricing-badge.component';

describe('DynamicPricingBadgeComponent', () => {
  let component: DynamicPricingBadgeComponent;
  let fixture: ComponentFixture<DynamicPricingBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicPricingBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicPricingBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
