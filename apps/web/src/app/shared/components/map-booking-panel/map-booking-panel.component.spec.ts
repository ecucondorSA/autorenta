import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapBookingPanelComponent } from './map-booking-panel.component';

describe('MapBookingPanelComponent', () => {
  let component: MapBookingPanelComponent;
  let fixture: ComponentFixture<MapBookingPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapBookingPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapBookingPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
