import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapLayersControlComponent } from './map-layers-control.component';

describe('MapLayersControlComponent', () => {
  let component: MapLayersControlComponent;
  let fixture: ComponentFixture<MapLayersControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapLayersControlComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapLayersControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
