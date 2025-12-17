import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormErrorAriaDirective } from './form-error-aria.directive';

describe('FormErrorAriaDirective', () => {
  let component: FormErrorAriaDirective;
  let fixture: ComponentFixture<FormErrorAriaDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormErrorAriaDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(FormErrorAriaDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
