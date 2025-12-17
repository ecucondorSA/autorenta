import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsService } from './user-notifications.service';

describe('NotificationsService', () => {
  let component: NotificationsService;
  let fixture: ComponentFixture<NotificationsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsService],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
