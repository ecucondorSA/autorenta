import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentOrchestrationService } from './payment-orchestration.service';

describe('PaymentOrchestrationService', () => {
  let component: PaymentOrchestrationService;
  let fixture: ComponentFixture<PaymentOrchestrationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentOrchestrationService],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentOrchestrationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
