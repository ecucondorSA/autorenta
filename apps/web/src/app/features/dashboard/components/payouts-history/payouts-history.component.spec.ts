import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayoutsHistoryComponent } from './payouts-history.component';

describe('PayoutsHistoryComponent', () => {
  let component: PayoutsHistoryComponent;
  let fixture: ComponentFixture<PayoutsHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutsHistoryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayoutsHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
