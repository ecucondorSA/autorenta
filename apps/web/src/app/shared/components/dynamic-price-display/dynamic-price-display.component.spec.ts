import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicPriceDisplayComponent } from './dynamic-price-display.component';

describe('DynamicPriceDisplayComponent', () => {
  let component: DynamicPriceDisplayComponent;
  let fixture: ComponentFixture<DynamicPriceDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicPriceDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicPriceDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
