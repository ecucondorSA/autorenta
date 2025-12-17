import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapDetailsPanelComponent } from './map-details-panel.component';

describe('MapDetailsPanelComponent', () => {
  let component: MapDetailsPanelComponent;
  let fixture: ComponentFixture<MapDetailsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapDetailsPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapDetailsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
