import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarAvailabilityService } from './car-availability.service';

describe('CarAvailabilityService', () => {
  let component: CarAvailabilityService;
  let fixture: ComponentFixture<CarAvailabilityService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarAvailabilityService],
    }).compileComponents();

    fixture = TestBed.createComponent(CarAvailabilityService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
