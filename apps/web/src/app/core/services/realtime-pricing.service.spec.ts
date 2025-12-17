import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RealtimePricingService } from './realtime-pricing.service';

describe('RealtimePricingService', () => {
  let component: RealtimePricingService;
  let fixture: ComponentFixture<RealtimePricingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RealtimePricingService],
    }).compileComponents();

    fixture = TestBed.createComponent(RealtimePricingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
