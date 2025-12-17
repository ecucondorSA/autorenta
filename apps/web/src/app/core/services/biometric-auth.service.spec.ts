import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiometricAuthService } from './biometric-auth.service';

describe('BiometricAuthService', () => {
  let component: BiometricAuthService;
  let fixture: ComponentFixture<BiometricAuthService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiometricAuthService],
    }).compileComponents();

    fixture = TestBed.createComponent(BiometricAuthService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
