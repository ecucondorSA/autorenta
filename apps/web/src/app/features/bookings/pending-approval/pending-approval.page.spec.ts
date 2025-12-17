import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PendingApprovalPage } from './pending-approval.page';

describe('PendingApprovalPage', () => {
  let component: PendingApprovalPage;
  let fixture: ComponentFixture<PendingApprovalPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingApprovalPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingApprovalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
