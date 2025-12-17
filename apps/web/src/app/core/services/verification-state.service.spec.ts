import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerificationStateService } from './verification-state.service';

describe('VerificationStateService', () => {
  let component: VerificationStateService;
  let fixture: ComponentFixture<VerificationStateService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationStateService],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationStateService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
