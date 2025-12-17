import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationManagerService } from './notification-manager.service';

describe('NotificationManagerService', () => {
  let component: NotificationManagerService;
  let fixture: ComponentFixture<NotificationManagerService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationManagerService],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationManagerService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
