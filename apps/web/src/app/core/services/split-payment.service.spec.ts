import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplitPaymentService } from './split-payment.service';

describe('SplitPaymentService', () => {
  let component: SplitPaymentService;
  let fixture: ComponentFixture<SplitPaymentService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplitPaymentService],
    }).compileComponents();

    fixture = TestBed.createComponent(SplitPaymentService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
