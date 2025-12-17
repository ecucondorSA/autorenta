import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InsuranceSelectorComponent } from './insurance-selector.component';

describe('InsuranceSelectorComponent', () => {
  let component: InsuranceSelectorComponent;
  let fixture: ComponentFixture<InsuranceSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsuranceSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InsuranceSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
