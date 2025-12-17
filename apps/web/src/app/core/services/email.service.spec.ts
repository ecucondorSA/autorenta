import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let component: EmailService;
  let fixture: ComponentFixture<EmailService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailService],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
