import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapCacheService } from './map-cache.service';

describe('MapCacheService', () => {
  let component: MapCacheService;
  let fixture: ComponentFixture<MapCacheService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapCacheService],
    }).compileComponents();

    fixture = TestBed.createComponent(MapCacheService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
