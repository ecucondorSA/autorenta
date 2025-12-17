import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PickupLocationSelectorComponent } from './pickup-location-selector.component';

describe('PickupLocationSelectorComponent', () => {
  let component: PickupLocationSelectorComponent;
  let fixture: ComponentFixture<PickupLocationSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PickupLocationSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PickupLocationSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
