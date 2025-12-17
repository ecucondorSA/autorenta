import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayoutService } from './payout.service';

describe('PayoutService', () => {
  let component: PayoutService;
  let fixture: ComponentFixture<PayoutService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutService],
    }).compileComponents();

    fixture = TestBed.createComponent(PayoutService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
