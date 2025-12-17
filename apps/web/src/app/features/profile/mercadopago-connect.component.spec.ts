import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MercadoPagoConnectComponent } from './mercadopago-connect.component';

describe('MercadoPagoConnectComponent', () => {
  let component: MercadoPagoConnectComponent;
  let fixture: ComponentFixture<MercadoPagoConnectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MercadoPagoConnectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MercadoPagoConnectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
