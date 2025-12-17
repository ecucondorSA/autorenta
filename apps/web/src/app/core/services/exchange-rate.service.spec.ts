import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExchangeRateService } from './exchange-rate.service';

describe('ExchangeRateService', () => {
  let component: ExchangeRateService;
  let fixture: ComponentFixture<ExchangeRateService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExchangeRateService],
    }).compileComponents();

    fixture = TestBed.createComponent(ExchangeRateService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
