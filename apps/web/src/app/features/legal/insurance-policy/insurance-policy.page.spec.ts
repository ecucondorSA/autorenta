import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InsurancePolicyPage } from './insurance-policy.page';

describe('InsurancePolicyPage', () => {
  let component: InsurancePolicyPage;
  let fixture: ComponentFixture<InsurancePolicyPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsurancePolicyPage],
    }).compileComponents();

    fixture = TestBed.createComponent(InsurancePolicyPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
