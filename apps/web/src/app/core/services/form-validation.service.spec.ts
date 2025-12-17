import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormValidationService } from './form-validation.service';

describe('FormValidationService', () => {
  let component: FormValidationService;
  let fixture: ComponentFixture<FormValidationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormValidationService],
    }).compileComponents();

    fixture = TestBed.createComponent(FormValidationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
