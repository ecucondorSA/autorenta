import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepperModalComponent } from './stepper-modal.component';

describe('StepperModalComponent', () => {
  let component: StepperModalComponent;
  let fixture: ComponentFixture<StepperModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepperModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StepperModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
