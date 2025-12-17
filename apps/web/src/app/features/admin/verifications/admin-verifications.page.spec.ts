import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminVerificationsPage } from './admin-verifications.page';

describe('AdminVerificationsPage', () => {
  let component: AdminVerificationsPage;
  let fixture: ComponentFixture<AdminVerificationsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminVerificationsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminVerificationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
