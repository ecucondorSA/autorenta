import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WithdrawalsAdminPage } from './withdrawals-admin.page';

describe('WithdrawalsAdminPage', () => {
  let component: WithdrawalsAdminPage;
  let fixture: ComponentFixture<WithdrawalsAdminPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithdrawalsAdminPage],
    }).compileComponents();

    fixture = TestBed.createComponent(WithdrawalsAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
