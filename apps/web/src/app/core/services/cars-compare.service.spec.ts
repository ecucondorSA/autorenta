import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarsCompareService } from './cars-compare.service';

describe('CarsCompareService', () => {
  let component: CarsCompareService;
  let fixture: ComponentFixture<CarsCompareService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarsCompareService],
    }).compileComponents();

    fixture = TestBed.createComponent(CarsCompareService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
