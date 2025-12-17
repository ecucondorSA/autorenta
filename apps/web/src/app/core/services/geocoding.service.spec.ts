import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let component: GeocodingService;
  let fixture: ComponentFixture<GeocodingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeocodingService],
    }).compileComponents();

    fixture = TestBed.createComponent(GeocodingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
