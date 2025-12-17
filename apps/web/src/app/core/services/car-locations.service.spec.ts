import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarLocationsService } from './car-locations.service';

describe('CarLocationsService', () => {
  let component: CarLocationsService;
  let fixture: ComponentFixture<CarLocationsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarLocationsService],
    }).compileComponents();

    fixture = TestBed.createComponent(CarLocationsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
