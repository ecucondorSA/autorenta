import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapDrawerComponent } from './map-drawer.component';

describe('MapDrawerComponent', () => {
  let component: MapDrawerComponent;
  let fixture: ComponentFixture<MapDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapDrawerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
