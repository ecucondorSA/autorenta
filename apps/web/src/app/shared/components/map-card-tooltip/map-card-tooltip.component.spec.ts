import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapCardTooltipComponent } from './map-card-tooltip.component';

describe('MapCardTooltipComponent', () => {
  let component: MapCardTooltipComponent;
  let fixture: ComponentFixture<MapCardTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapCardTooltipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapCardTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
