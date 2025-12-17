import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapboxDirectionsService } from './mapbox-directions.service';

describe('MapboxDirectionsService', () => {
  let component: MapboxDirectionsService;
  let fixture: ComponentFixture<MapboxDirectionsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapboxDirectionsService],
    }).compileComponents();

    fixture = TestBed.createComponent(MapboxDirectionsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
