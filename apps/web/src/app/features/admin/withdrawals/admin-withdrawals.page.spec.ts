import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminWithdrawalsPage } from './admin-withdrawals.page';

describe('AdminWithdrawalsPage', () => {
  let component: AdminWithdrawalsPage;
  let fixture: ComponentFixture<AdminWithdrawalsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminWithdrawalsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminWithdrawalsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
