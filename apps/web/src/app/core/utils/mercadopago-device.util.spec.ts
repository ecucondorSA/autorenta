import { ComponentFixture, TestBed } from '@angular/core/testing';
import { mercadopago-device.util } from './mercadopago-device.util';

describe('mercadopago-device.util', () => {
  let component: mercadopago-device.util;
  let fixture: ComponentFixture<mercadopago-device.util>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [mercadopago-device.util],
    }).compileComponents();

    fixture = TestBed.createComponent(mercadopago-device.util);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
