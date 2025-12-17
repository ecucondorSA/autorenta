import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripSafetyService } from './trip-safety.service';

describe('TripSafetyService', () => {
  let component: TripSafetyService;
  let fixture: ComponentFixture<TripSafetyService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripSafetyService],
    }).compileComponents();

    fixture = TestBed.createComponent(TripSafetyService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
