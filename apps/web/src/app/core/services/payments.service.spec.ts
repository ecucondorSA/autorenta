import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let component: PaymentsService;
  let fixture: ComponentFixture<PaymentsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsService],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
