import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MercadoPagoCallbackPage } from './mercadopago-callback.page';

describe('MercadoPagoCallbackPage', () => {
  let component: MercadoPagoCallbackPage;
  let fixture: ComponentFixture<MercadoPagoCallbackPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MercadoPagoCallbackPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MercadoPagoCallbackPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
