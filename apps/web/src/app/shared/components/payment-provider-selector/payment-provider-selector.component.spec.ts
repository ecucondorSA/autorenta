import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentProviderSelectorComponent } from './payment-provider-selector.component';

describe('PaymentProviderSelectorComponent', () => {
  let component: PaymentProviderSelectorComponent;
  let fixture: ComponentFixture<PaymentProviderSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentProviderSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentProviderSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
