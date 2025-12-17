import { ComponentFixture, TestBed } from '@angular/core/testing';
import { age-calculator } from './age-calculator';

describe('age-calculator', () => {
  let component: age-calculator;
  let fixture: ComponentFixture<age-calculator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [age-calculator],
    }).compileComponents();

    fixture = TestBed.createComponent(age-calculator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
