import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiveTrackingMapComponent } from './live-tracking-map.component';

describe('LiveTrackingMapComponent', () => {
  let component: LiveTrackingMapComponent;
  let fixture: ComponentFixture<LiveTrackingMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTrackingMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveTrackingMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
