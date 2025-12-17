import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayoutHistoryComponent } from './payout-history.component';

describe('PayoutHistoryComponent', () => {
  let component: PayoutHistoryComponent;
  let fixture: ComponentFixture<PayoutHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutHistoryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayoutHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
