import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminClaimDetailPage } from './admin-claim-detail.page';

describe('AdminClaimDetailPage', () => {
  let component: AdminClaimDetailPage;
  let fixture: ComponentFixture<AdminClaimDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminClaimDetailPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminClaimDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
