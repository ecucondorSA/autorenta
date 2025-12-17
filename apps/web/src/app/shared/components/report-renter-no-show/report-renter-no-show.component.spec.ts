import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportRenterNoShowComponent } from './report-renter-no-show.component';

describe('ReportRenterNoShowComponent', () => {
  let component: ReportRenterNoShowComponent;
  let fixture: ComponentFixture<ReportRenterNoShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportRenterNoShowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportRenterNoShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
