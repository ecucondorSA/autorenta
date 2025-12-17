import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationTemplatesService } from './notification-templates.service';

describe('NotificationTemplatesService', () => {
  let component: NotificationTemplatesService;
  let fixture: ComponentFixture<NotificationTemplatesService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationTemplatesService],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationTemplatesService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
