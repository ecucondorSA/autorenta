import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSuspendedUsersPage } from './admin-suspended-users.page';

describe('AdminSuspendedUsersPage', () => {
  let component: AdminSuspendedUsersPage;
  let fixture: ComponentFixture<AdminSuspendedUsersPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSuspendedUsersPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSuspendedUsersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
