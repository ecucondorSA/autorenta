import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DriverProfileAdvancedComponent } from './driver-profile-advanced.component';

describe('DriverProfileAdvancedComponent', () => {
  let component: DriverProfileAdvancedComponent;
  let fixture: ComponentFixture<DriverProfileAdvancedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverProfileAdvancedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DriverProfileAdvancedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
