import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportOwnerNoShowComponent } from './report-owner-no-show.component';

describe('ReportOwnerNoShowComponent', () => {
  let component: ReportOwnerNoShowComponent;
  let fixture: ComponentFixture<ReportOwnerNoShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportOwnerNoShowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportOwnerNoShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
