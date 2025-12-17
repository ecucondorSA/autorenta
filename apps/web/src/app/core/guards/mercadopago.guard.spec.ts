import { ComponentFixture, TestBed } from '@angular/core/testing';
import { mercadopago.guard } from './mercadopago.guard';

describe('mercadopago.guard', () => {
  let component: mercadopago.guard;
  let fixture: ComponentFixture<mercadopago.guard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [mercadopago.guard],
    }).compileComponents();

    fixture = TestBed.createComponent(mercadopago.guard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
