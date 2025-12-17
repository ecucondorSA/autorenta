import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  let component: PushNotificationService;
  let fixture: ComponentFixture<PushNotificationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PushNotificationService],
    }).compileComponents();

    fixture = TestBed.createComponent(PushNotificationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
