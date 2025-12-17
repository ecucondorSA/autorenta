import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HapticFeedbackService } from './haptic-feedback.service';

describe('HapticFeedbackService', () => {
  let component: HapticFeedbackService;
  let fixture: ComponentFixture<HapticFeedbackService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HapticFeedbackService],
    }).compileComponents();

    fixture = TestBed.createComponent(HapticFeedbackService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
