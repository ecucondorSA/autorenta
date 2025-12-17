import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayoutStatsComponent } from './payout-stats.component';

describe('PayoutStatsComponent', () => {
  let component: PayoutStatsComponent;
  let fixture: ComponentFixture<PayoutStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutStatsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayoutStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
