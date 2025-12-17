import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationSoundService } from './notification-sound.service';

describe('NotificationSoundService', () => {
  let component: NotificationSoundService;
  let fixture: ComponentFixture<NotificationSoundService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationSoundService],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationSoundService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
