import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicPriceLockPanelComponent } from './dynamic-price-lock-panel.component';

describe('DynamicPriceLockPanelComponent', () => {
  let component: DynamicPriceLockPanelComponent;
  let fixture: ComponentFixture<DynamicPriceLockPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicPriceLockPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicPriceLockPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
