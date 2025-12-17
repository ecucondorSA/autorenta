import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TouchFeedbackDirective } from './touch-feedback.directive';

describe('TouchFeedbackDirective', () => {
  let component: TouchFeedbackDirective;
  let fixture: ComponentFixture<TouchFeedbackDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TouchFeedbackDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TouchFeedbackDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
