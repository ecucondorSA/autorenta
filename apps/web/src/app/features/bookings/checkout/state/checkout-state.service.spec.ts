import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutStateService } from './checkout-state.service';

describe('CheckoutStateService', () => {
  let component: CheckoutStateService;
  let fixture: ComponentFixture<CheckoutStateService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutStateService],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutStateService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
