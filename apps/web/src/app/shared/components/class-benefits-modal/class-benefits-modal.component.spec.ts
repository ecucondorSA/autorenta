import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClassBenefitsModalComponent } from './class-benefits-modal.component';

describe('ClassBenefitsModalComponent', () => {
  let component: ClassBenefitsModalComponent;
  let fixture: ComponentFixture<ClassBenefitsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassBenefitsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassBenefitsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
