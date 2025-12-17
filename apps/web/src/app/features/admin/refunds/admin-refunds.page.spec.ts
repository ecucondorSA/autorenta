import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminRefundsPage } from './admin-refunds.page';

describe('AdminRefundsPage', () => {
  let component: AdminRefundsPage;
  let fixture: ComponentFixture<AdminRefundsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRefundsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRefundsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
