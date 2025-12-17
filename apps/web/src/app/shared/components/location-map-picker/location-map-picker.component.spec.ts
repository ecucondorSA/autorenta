import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocationMapPickerComponent } from './location-map-picker.component';

describe('LocationMapPickerComponent', () => {
  let component: LocationMapPickerComponent;
  let fixture: ComponentFixture<LocationMapPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationMapPickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationMapPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
