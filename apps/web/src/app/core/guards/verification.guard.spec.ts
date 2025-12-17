import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerificationGuard } from './verification.guard';

describe('VerificationGuard', () => {
  let component: VerificationGuard;
  let fixture: ComponentFixture<VerificationGuard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationGuard],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationGuard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
