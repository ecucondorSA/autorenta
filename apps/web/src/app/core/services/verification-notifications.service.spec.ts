import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerificationNotificationsService } from './verification-notifications.service';

describe('VerificationNotificationsService', () => {
  let component: VerificationNotificationsService;
  let fixture: ComponentFixture<VerificationNotificationsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationNotificationsService],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationNotificationsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
