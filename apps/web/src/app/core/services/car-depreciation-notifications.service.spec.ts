import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarDepreciationNotificationsService } from './car-depreciation-notifications.service';

describe('CarDepreciationNotificationsService', () => {
  let component: CarDepreciationNotificationsService;
  let fixture: ComponentFixture<CarDepreciationNotificationsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarDepreciationNotificationsService],
    }).compileComponents();

    fixture = TestBed.createComponent(CarDepreciationNotificationsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
