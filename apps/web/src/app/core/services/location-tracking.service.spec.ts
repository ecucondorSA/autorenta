import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocationTrackingService } from './location-tracking.service';

describe('LocationTrackingService', () => {
  let component: LocationTrackingService;
  let fixture: ComponentFixture<LocationTrackingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationTrackingService],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationTrackingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
