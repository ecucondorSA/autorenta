import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DriverProfileService } from './driver-profile.service';

describe('DriverProfileService', () => {
  let component: DriverProfileService;
  let fixture: ComponentFixture<DriverProfileService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverProfileService],
    }).compileComponents();

    fixture = TestBed.createComponent(DriverProfileService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
