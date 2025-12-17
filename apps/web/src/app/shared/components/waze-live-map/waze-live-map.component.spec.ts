import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WazeLiveMapComponent } from './waze-live-map.component';

describe('WazeLiveMapComponent', () => {
  let component: WazeLiveMapComponent;
  let fixture: ComponentFixture<WazeLiveMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WazeLiveMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WazeLiveMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
