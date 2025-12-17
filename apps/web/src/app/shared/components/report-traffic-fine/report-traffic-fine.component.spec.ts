import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportTrafficFineComponent } from './report-traffic-fine.component';

describe('ReportTrafficFineComponent', () => {
  let component: ReportTrafficFineComponent;
  let fixture: ComponentFixture<ReportTrafficFineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportTrafficFineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportTrafficFineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
