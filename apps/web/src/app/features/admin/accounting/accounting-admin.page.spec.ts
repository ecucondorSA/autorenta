import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountingAdminPage } from './accounting-admin.page';

describe('AccountingAdminPage', () => {
  let component: AccountingAdminPage;
  let fixture: ComponentFixture<AccountingAdminPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountingAdminPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountingAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
