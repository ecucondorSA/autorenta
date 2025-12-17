import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsSettingsPage } from './notifications-settings.page';

describe('NotificationsSettingsPage', () => {
  let component: NotificationsSettingsPage;
  let fixture: ComponentFixture<NotificationsSettingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsSettingsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsSettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
