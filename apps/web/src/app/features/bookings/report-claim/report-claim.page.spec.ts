import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportClaimPage } from './report-claim.page';

describe('ReportClaimPage', () => {
  let component: ReportClaimPage;
  let fixture: ComponentFixture<ReportClaimPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportClaimPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportClaimPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
