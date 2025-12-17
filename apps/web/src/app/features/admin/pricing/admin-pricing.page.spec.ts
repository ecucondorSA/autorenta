import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPricingPage } from './admin-pricing.page';

describe('AdminPricingPage', () => {
  let component: AdminPricingPage;
  let fixture: ComponentFixture<AdminPricingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPricingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPricingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
