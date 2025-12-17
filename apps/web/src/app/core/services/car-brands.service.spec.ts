import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarBrandsService } from './car-brands.service';

describe('CarBrandsService', () => {
  let component: CarBrandsService;
  let fixture: ComponentFixture<CarBrandsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarBrandsService],
    }).compileComponents();

    fixture = TestBed.createComponent(CarBrandsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
