import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicPriceBreakdownModalComponent } from './dynamic-price-breakdown-modal.component';

describe('DynamicPriceBreakdownModalComponent', () => {
  let component: DynamicPriceBreakdownModalComponent;
  let fixture: ComponentFixture<DynamicPriceBreakdownModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicPriceBreakdownModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicPriceBreakdownModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
