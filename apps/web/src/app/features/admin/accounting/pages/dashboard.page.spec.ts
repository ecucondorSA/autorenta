import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountingDashboardPage } from './dashboard.page';

describe('AccountingDashboardPage', () => {
  let component: AccountingDashboardPage;
  let fixture: ComponentFixture<AccountingDashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountingDashboardPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountingDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
