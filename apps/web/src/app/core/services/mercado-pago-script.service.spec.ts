import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MercadoPagoScriptService } from './mercado-pago-script.service';

describe('MercadoPagoScriptService', () => {
  let component: MercadoPagoScriptService;
  let fixture: ComponentFixture<MercadoPagoScriptService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MercadoPagoScriptService],
    }).compileComponents();

    fixture = TestBed.createComponent(MercadoPagoScriptService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
