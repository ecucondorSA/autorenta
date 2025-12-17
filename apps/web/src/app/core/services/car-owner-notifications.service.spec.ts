import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarOwnerNotificationsService } from './car-owner-notifications.service';

describe('CarOwnerNotificationsService', () => {
  let component: CarOwnerNotificationsService;
  let fixture: ComponentFixture<CarOwnerNotificationsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarOwnerNotificationsService],
    }).compileComponents();

    fixture = TestBed.createComponent(CarOwnerNotificationsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
