import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentAuthorizationService } from './payment-authorization.service';

describe('PaymentAuthorizationService', () => {
  let component: PaymentAuthorizationService;
  let fixture: ComponentFixture<PaymentAuthorizationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentAuthorizationService],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentAuthorizationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
