import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InitialGoalModalComponent } from './initial-goal-modal.component';

describe('InitialGoalModalComponent', () => {
  let component: InitialGoalModalComponent;
  let fixture: ComponentFixture<InitialGoalModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InitialGoalModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InitialGoalModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
