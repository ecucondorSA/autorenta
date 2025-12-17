import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MercadopagoCardFormComponent } from './mercadopago-card-form.component';

describe('MercadopagoCardFormComponent', () => {
  let component: MercadopagoCardFormComponent;
  let fixture: ComponentFixture<MercadopagoCardFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MercadopagoCardFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MercadopagoCardFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
