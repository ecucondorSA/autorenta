import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapboxPreloaderService } from './mapbox-preloader.service';

describe('MapboxPreloaderService', () => {
  let component: MapboxPreloaderService;
  let fixture: ComponentFixture<MapboxPreloaderService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapboxPreloaderService],
    }).compileComponents();

    fixture = TestBed.createComponent(MapboxPreloaderService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
