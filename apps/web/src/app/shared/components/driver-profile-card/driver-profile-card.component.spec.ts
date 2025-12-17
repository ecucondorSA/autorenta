import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DriverProfileCardComponent } from './driver-profile-card.component';

describe('DriverProfileCardComponent', () => {
  let component: DriverProfileCardComponent;
  let fixture: ComponentFixture<DriverProfileCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverProfileCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DriverProfileCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
