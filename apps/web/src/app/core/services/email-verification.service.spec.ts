import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  let component: EmailVerificationService;
  let fixture: ComponentFixture<EmailVerificationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailVerificationService],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailVerificationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
