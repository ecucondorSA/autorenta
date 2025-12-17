import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InsuranceService } from './insurance.service';

describe('InsuranceService', () => {
  let component: InsuranceService;
  let fixture: ComponentFixture<InsuranceService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsuranceService],
    }).compileComponents();

    fixture = TestBed.createComponent(InsuranceService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
