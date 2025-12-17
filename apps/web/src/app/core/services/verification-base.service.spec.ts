import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneVerificationService } from './verification-base.service';

describe('PhoneVerificationService', () => {
  let component: PhoneVerificationService;
  let fixture: ComponentFixture<PhoneVerificationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhoneVerificationService],
    }).compileComponents();

    fixture = TestBed.createComponent(PhoneVerificationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
