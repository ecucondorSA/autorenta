import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfessionalDateInputComponent } from './professional-date-input.component';

describe('ProfessionalDateInputComponent', () => {
  let component: ProfessionalDateInputComponent;
  let fixture: ComponentFixture<ProfessionalDateInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessionalDateInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfessionalDateInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
