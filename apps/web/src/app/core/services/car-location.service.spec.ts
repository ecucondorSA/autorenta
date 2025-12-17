import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarLocationService } from './car-location.service';

describe('CarLocationService', () => {
  let component: CarLocationService;
  let fixture: ComponentFixture<CarLocationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarLocationService],
    }).compileComponents();

    fixture = TestBed.createComponent(CarLocationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
