import { ComponentFixture, TestBed } from '@angular/core/testing';
import { payment-gateway.interface } from './payment-gateway.interface';

describe('payment-gateway.interface', () => {
  let component: payment-gateway.interface;
  let fixture: ComponentFixture<payment-gateway.interface>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [payment-gateway.interface],
    }).compileComponents();

    fixture = TestBed.createComponent(payment-gateway.interface);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
