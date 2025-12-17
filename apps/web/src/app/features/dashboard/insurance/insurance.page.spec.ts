import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InsurancePage } from './insurance.page';

describe('InsurancePage', () => {
  let component: InsurancePage;
  let fixture: ComponentFixture<InsurancePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsurancePage],
    }).compileComponents();

    fixture = TestBed.createComponent(InsurancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
